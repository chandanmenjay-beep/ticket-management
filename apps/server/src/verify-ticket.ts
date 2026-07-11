import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
  });

  await client.connect();
  console.log("Connected to database directly!");

  const res = await client.query('SELECT id, subject, status FROM "Ticket" ORDER BY "createdAt" DESC LIMIT 1');
  if (res.rows.length > 0) {
    console.log("Latest ticket:", res.rows[0]);
  } else {
    console.log("No tickets found.");
  }

  const resMsg = await client.query('SELECT "bodyText" FROM "TicketMessage" WHERE "ticketId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [res.rows[0].id]);
  if (resMsg.rows.length > 0) {
    console.log("Latest message:", resMsg.rows[0]);
  }

  await client.end();
}

verify().catch(console.error);
