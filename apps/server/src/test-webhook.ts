import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function testWebhook() {
  try {
    const form = new FormData();
    form.append('from', '"Jane Doe" <jane@example.com>');
    form.append('subject', 'Help me with my account');
    form.append('text', 'I cannot log in to my account. Please help.');
    form.append('html', '<p>I cannot log in to my account. Please help.</p>');
    form.append('headers', 'Message-ID: <test-12345-v3@example.com>\nDate: Mon, 26 Jun 2026 10:00:00 +0000');

    console.log('Sending initial email to create a ticket...');
    const res1 = await fetch('http://localhost:3000/api/webhooks/inbound-email?token=default-secret-key', {
      method: 'POST',
      body: form
    });
    console.log('Response 1:', res1.status, await res1.text());

    // Wait a moment
    await new Promise(r => setTimeout(r, 1000));

    // Send a reply
    const replyForm = new FormData();
    replyForm.append('from', '"Jane Doe" <jane@example.com>');
    replyForm.append('subject', 'Re: Help me with my account');
    replyForm.append('text', 'Any updates on this?');
    replyForm.append('headers', 'Message-ID: <reply-67890-v3@example.com>\nIn-Reply-To: <test-12345-v3@example.com>');

    console.log('Sending reply email to existing thread...');
    const res2 = await fetch('http://localhost:3000/api/webhooks/inbound-email?token=default-secret-key', {
      method: 'POST',
      body: replyForm
    });
    console.log('Response 2:', res2.status, await res2.text());

    // Verify DB
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const customer = await prisma.customer.findUnique({ where: { email: 'jane@example.com' } });
    if (!customer) throw new Error("Customer not found!");

    const tickets = await prisma.ticket.findMany({ 
      where: { customerId: customer.id },
      include: { messages: true }
    });

    console.log(`\nFound ${tickets.length} tickets for Jane Doe.`);
    for (const ticket of tickets) {
      console.log(`Ticket: ${ticket.subject} - Messages: ${ticket.messages.length}`);
      for (const msg of ticket.messages) {
        console.log(`  -> ${msg.messageId}`);
      }
    }
    process.exit(0);
  } catch (err: any) {
    console.error('Error testing webhook:', err.message);
    process.exit(1);
  }
}

testWebhook();
