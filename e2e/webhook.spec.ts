import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:51214/template1_test' 
});

test.describe('Inbound Email Webhook API', () => {

  test.afterAll(async () => {
    await pool.end();
  });

  test('should parse inbound email, create ticket, and handle replies', async ({ request }) => {
    const timestamp = Date.now();
    const customerEmail = `e2e-user-${timestamp}@example.com`;
    const messageId1 = `<msg-${timestamp}-1@example.com>`;
    const messageId2 = `<msg-${timestamp}-2@example.com>`;

    // --- STEP 1: Send Initial Email ---
    const response1 = await request.post('http://localhost:3000/api/webhooks/inbound-email', {
      params: { token: 'default-secret-key' },
      multipart: {
        from: `"E2E Customer" <${customerEmail}>`,
        subject: 'E2E Webhook Test',
        text: 'This is the first email.',
        html: '<p>This is the first email.</p>',
        headers: `Message-ID: ${messageId1}\nDate: Mon, 26 Jun 2026 10:00:00 +0000`
      }
    });

    expect(response1.ok()).toBeTruthy();

    // Verify DB state
    const customerRes = await pool.query('SELECT * FROM "Customer" WHERE email = $1', [customerEmail]);
    expect(customerRes.rowCount).toBe(1);
    const customerId = customerRes.rows[0].id;
    expect(customerRes.rows[0].name).toBe('E2E Customer');

    const ticketRes1 = await pool.query('SELECT * FROM "Ticket" WHERE "customerId" = $1', [customerId]);
    expect(ticketRes1.rowCount).toBe(1);
    const ticketId = ticketRes1.rows[0].id;
    expect(ticketRes1.rows[0].subject).toBe('E2E Webhook Test');

    const msgRes1 = await pool.query('SELECT * FROM "TicketMessage" WHERE "ticketId" = $1', [ticketId]);
    expect(msgRes1.rowCount).toBe(1);
    expect(msgRes1.rows[0].messageId).toBe(messageId1.replace(/[<>]/g, ''));


    // --- STEP 2: Send Reply Email ---
    const response2 = await request.post('http://localhost:3000/api/webhooks/inbound-email', {
      params: { token: 'default-secret-key' },
      multipart: {
        from: `"E2E Customer" <${customerEmail}>`,
        subject: 'Re: E2E Webhook Test',
        text: 'This is the reply.',
        headers: `Message-ID: ${messageId2}\nIn-Reply-To: ${messageId1}`
      }
    });

    expect(response2.ok()).toBeTruthy();

    // Verify DB state
    const ticketRes2 = await pool.query('SELECT * FROM "Ticket" WHERE "customerId" = $1', [customerId]);
    expect(ticketRes2.rowCount).toBe(1); // Still exactly 1 ticket

    const msgRes2 = await pool.query('SELECT * FROM "TicketMessage" WHERE "ticketId" = $1 ORDER BY "createdAt" ASC', [ticketId]);
    expect(msgRes2.rowCount).toBe(2); // Now 2 messages
    expect(msgRes2.rows[1].messageId).toBe(messageId2.replace(/[<>]/g, ''));
    expect(msgRes2.rows[1].bodyText).toBe('This is the reply.');
  });
});
