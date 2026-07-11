import { classifyTicketJob } from './jobs/classify-ticket';
import type { Job } from 'pg-boss';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function run() {
  const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { messages: true }
  });

  if (tickets.length === 0) {
    console.log("No tickets found.");
    process.exit(1);
  }

  const t = tickets[0];
  const m = t.messages[0];

  const jobData = {
    ticketId: t.id,
    subject: t.subject,
    bodyText: m.bodyText
  };

  console.log("Running classifyTicketJob manually for ticket:", t.id);
  
  const job = { id: 'test-job', name: 'classify-ticket', data: jobData } as Job<any>;
  
  await classifyTicketJob(job);
  
  console.log("Job finished.");
  process.exit(0);
}

run().catch(console.error);
