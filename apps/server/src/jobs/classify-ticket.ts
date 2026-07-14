import { Job } from 'pg-boss';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/auth';
import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

interface ClassifyTicketData {
  ticketId: string;
  subject: string;
  bodyText: string;
  customerEmail?: string;
  customerName?: string;
}

import { sendEmail } from '../lib/email';

export async function classifyTicketJob(job: Job<ClassifyTicketData>) {
  const { ticketId, subject, bodyText, customerEmail, customerName } = job.data;
  console.log(`[Job] Classifying ticket ${ticketId}...`);

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `Classify the following customer support ticket into exactly one of these categories: "technical", "refund", "renewal", or "general". Reply with just the category name in lowercase and nothing else.\n\nSubject: ${subject}\n\nBody:\n${bodyText}`,
    });

    let category = text.trim().toLowerCase();
    const validCategories = ['technical', 'refund', 'renewal', 'general'];
    
    if (!validCategories.includes(category)) {
      category = 'general';
    }

    // Attempt Auto-Resolution
    const kbPath = path.join(__dirname, '../../knowledge-base.md');
    let kbContent = '';
    try {
      kbContent = await fs.readFile(kbPath, 'utf-8');
    } catch (e) {
      console.error(`[Job] Could not read knowledge-base.md from ${kbPath}`, e);
    }

    let customerFirstName = 'Customer';
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { customer: true }
      });
      if (ticket?.customer?.name) {
        customerFirstName = ticket.customer.name.split(' ')[0];
      }
    } catch (e) {
      console.error(`[Job] Failed to fetch customer name for ticket ${ticketId}`, e);
    }

    let resolved = false;
    if (kbContent) {
      const { object: resolution } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: z.object({
          canResolve: z.boolean(),
          response: z.string().nullable().describe('The message to send to the customer if it can be resolved'),
        }),
        prompt: `You are a helpful customer support agent.
Use the provided knowledge base to help answer the user's query if applicable.
If the knowledge base doesn't contain the exact answer, you can still use your general knowledge to provide a helpful, professional troubleshooting response.
If you can provide a helpful response (either from KB or general knowledge), set canResolve to true and provide the exact response to send to the customer in 'response'.
If the query is too complex, requires internal system access, or you simply cannot help, set canResolve to false and response to null.

CRITICAL INSTRUCTIONS FOR THE REPLY:
- Address the customer by their first name: ${customerFirstName}
- Sign the email with exactly: "Chandan Mahato"
- Ensure the tone is professional, empathetic, and customer-friendly.
- Properly format the reply with clear paragraphs and spacing.

Knowledge Base:
${kbContent}

Customer Ticket Subject: ${subject}
Customer Ticket Body:
${bodyText}`
      });
      
      if (resolution.canResolve && resolution.response) {
        await prisma.ticketMessage.create({
          data: {
            ticketId,
            bodyText: resolution.response,
            senderType: 'AGENT',
          }
        });
        resolved = true;
        console.log(`[Job] Ticket ${ticketId} auto-resolved by AI.`);

        // Send email back to the customer if email is provided
        if (customerEmail) {
          const emailSubject = `Re: ${subject} [Ticket #${ticketId}]`;
          const emailBody = `<p>Hi ${customerName || customerFirstName},</p><br/><p>${resolution.response.replace(/\\n/g, '<br/>')}</p>`;
          await sendEmail(customerEmail, emailSubject, emailBody);
        }
      }
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { 
        category,
        ...(resolved ? { status: 'resolved' } : { assignedToId: null })
      }
    });
    console.log(`[Job] Classified ticket ${ticketId} as ${category}`);
  } catch (error) {
    console.error(`[Job] Failed to classify ticket ${ticketId}:`, error);
    throw error; // pg-boss will handle retries if configured
  }
}
