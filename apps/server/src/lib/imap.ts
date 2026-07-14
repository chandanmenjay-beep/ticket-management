import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './auth';
import { boss } from './boss';
import { sendEmail } from './email';

export const startImapListener = async () => {
  if (!process.env.IMAP_EMAIL || !process.env.IMAP_PASSWORD) {
    console.warn("Email variables not set, skipping IMAP listener.");
    return;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.IMAP_EMAIL,
      pass: process.env.IMAP_PASSWORD
    },
    logger: false,
  });

  const processUnseenMessages = async () => {
    let lock;
    try {
      lock = await client.getMailboxLock('INBOX');
      // Search for unseen messages
      const list = await client.search({ seen: false });
      if (list && list.length > 0) {
        for (const seq of list) {
          try {
            const msg = await client.fetchOne(seq, { source: true });
            if (msg && msg.source) {
              const parsed = await simpleParser(msg.source);
              
              const fromAddress = parsed.from?.value[0]?.address || 'unknown@example.com';
              const fromName = parsed.from?.value[0]?.name || 'Unknown';
              const subject = parsed.subject || 'No Subject';
              const bodyText = parsed.text || '';
              const bodyHtml = parsed.html || '';
              const messageId = parsed.messageId || `msg-${Date.now()}`;

              // Testing Filter: Only process emails from chandan43rs@gmail.com
              if (fromAddress.toLowerCase() !== 'chandan43rs@gmail.com') {
                console.log(`[IMAP] Ignoring email from ${fromAddress} (Not the test email)`);
                await client.messageFlagsAdd(seq, ['\\Seen']);
                continue;
              }

              // Check if customer exists
              let customer = await prisma.customer.findUnique({
                where: { email: fromAddress }
              });

              if (!customer) {
                customer = await prisma.customer.create({
                  data: {
                    email: fromAddress,
                    name: fromName,
                  }
                });
              }

              // Create ticket
              const ticket = await prisma.ticket.create({
                data: {
                  subject,
                  customerId: customer.id,
                  status: 'open',
                }
              });

              // Create message
              await prisma.ticketMessage.create({
                data: {
                  ticketId: ticket.id,
                  bodyText,
                  bodyHtml,
                  senderType: 'CUSTOMER',
                  senderId: customer.id,
                  messageId
                }
              });

              console.log(`[IMAP] Created ticket ${ticket.id} from ${fromAddress}`);
              
              // Trigger AI classification
              await boss.send('classify-ticket', {
                ticketId: ticket.id,
                subject,
                bodyText,
                customerEmail: fromAddress,
                customerName: fromName
              });

              // Send acknowledgment
              await sendEmail(
                fromAddress,
                `Re: ${subject} [Ticket #${ticket.id}]`,
                `<p>Hi ${fromName},</p><p>We have received your request. Your ticket ID is <b>${ticket.id}</b>.</p><p>We will get back to you shortly.</p>`
              );
            }
            // Mark as seen
            await client.messageFlagsAdd(seq, ['\\Seen']);
          } catch(e) {
             console.error(`[IMAP] Failed to process message ${seq}`, e);
          }
        }
      }
    } catch (err) {
      console.error("[IMAP] Error processing unseen messages", err);
    } finally {
      if (lock) lock.release();
    }
  };

  try {
    await client.connect();
    console.log('[IMAP] Connected to IMAP server');
    
    // Process any existing unseen messages initially
    await processUnseenMessages();

    // Listen for new messages
    client.on('exists', async (data) => {
      console.log(`[IMAP] New message exists event:`, data);
      await processUnseenMessages();
    });
    
    // Also poll every 2 minutes as a fallback
    setInterval(async () => {
      try {
        await processUnseenMessages();
      } catch(e) {}
    }, 120000);

  } catch (err) {
    console.error('[IMAP] Failed to connect', err);
  }
};
