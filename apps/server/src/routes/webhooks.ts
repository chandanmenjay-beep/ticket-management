import { Router, Request, Response } from 'express';
import multer from 'multer';
import xss from 'xss';
import { prisma } from '../lib/auth';
import { boss } from '../lib/boss';

const router = Router();

const upload = multer();

/**
 * Handle incoming emails from SendGrid Inbound Parse or Mailgun
 */
router.post('/inbound-email', upload.none(), async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    const expectedToken = process.env.WEBHOOK_SECRET_KEY || 'default-secret-key';
    
    if (token !== expectedToken) {
      return res.status(401).send('Unauthorized');
    }

    // SendGrid payload fields
    const { from, subject, text, html, headers } = req.body;

    if (!from) {
      return res.status(400).send('Missing "from" field');
    }

    // Extract email address from format "Name <email@example.com>" or "email@example.com"
    const emailMatch = from.match(/<([^>]+)>/);
    const customerEmail = emailMatch ? emailMatch[1] : from;
    const nameMatch = from.match(/^([^<]+)/);
    const customerName = nameMatch ? nameMatch[1].trim().replace(/(^"|"$)/g, '') : null;

    // Extract Message-ID and In-Reply-To from headers
    // SendGrid passes headers as a single string of key-value pairs separated by \n
    let messageId: string | undefined;
    let inReplyTo: string | undefined;
    let references: string | undefined;

    if (headers && typeof headers === 'string') {
      const headerLines = headers.split('\n');
      for (const line of headerLines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('message-id:')) {
          messageId = line.substring(11).trim().replace(/[<>]/g, '');
        } else if (lowerLine.startsWith('in-reply-to:')) {
          inReplyTo = line.substring(12).trim().replace(/[<>]/g, '');
        } else if (lowerLine.startsWith('references:')) {
          references = line.substring(11).trim();
        }
      }
    }

    // Identify or Create Customer
    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        name: customerName || undefined // only update if provided
      },
      create: {
        email: customerEmail,
        name: customerName
      }
    });

    let matchedTicketId: string | null = null;

    // Check threading
    if (inReplyTo) {
      const existingMessage = await prisma.ticketMessage.findUnique({
        where: { messageId: inReplyTo }
      });
      if (existingMessage) {
        matchedTicketId = existingMessage.ticketId;
      }
    }

    if (!matchedTicketId && references) {
      // Split references and check the last one first, then others
      const refIds = references.split(/\s+/).map(r => r.replace(/[<>]/g, '')).filter(Boolean);
      for (let i = refIds.length - 1; i >= 0; i--) {
        const existingMessage = await prisma.ticketMessage.findUnique({
          where: { messageId: refIds[i] }
        });
        if (existingMessage) {
          matchedTicketId = existingMessage.ticketId;
          break;
        }
      }
    }

    if (matchedTicketId) {
      // This is a reply to an existing ticket
      await prisma.ticketMessage.create({
        data: {
          ticketId: matchedTicketId,
          bodyText: text ? xss(text) : '',
          bodyHtml: html ? xss(html) : null,
          senderType: 'CUSTOMER',
          senderId: customer.id,
          messageId: messageId || null
        }
      });

      // Update ticket status to open so it pops back up for agents
      await prisma.ticket.update({
        where: { id: matchedTicketId },
        data: { status: 'open', updatedAt: new Date() }
      });
      // Find the AI agent
      const aiAgent = await prisma.user.findUnique({
        where: { email: 'ai@system.local' }
      });

      // Brand new ticket
      const newTicket = await prisma.ticket.create({
        data: {
          subject: subject || '(No Subject)',
          customerId: customer.id,
          assignedToId: aiAgent ? aiAgent.id : null,
          messages: {
            create: {
              bodyText: text ? xss(text) : '',
              bodyHtml: html ? xss(html) : null,
              senderType: 'CUSTOMER',
              senderId: customer.id,
              messageId: messageId || null
            }
          }
        }
      });
      // Trigger background classification via pg-boss
      await boss.send('classify-ticket', { 
        ticketId: newTicket.id, 
        subject: newTicket.subject, 
        bodyText: text || '' 
      });
    }

    // Respond with 200 OK so the email provider knows we received it
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing inbound email:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
