import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Creating Customer table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Customer" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
    );
  `);
  
  console.log("Adding unique constraint to Customer email...");
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_key" ON "Customer"("email");
  `);

  console.log("Creating Ticket table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Ticket" (
      "id" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'open',
      "priority" TEXT NOT NULL DEFAULT 'normal',
      "customerId" TEXT NOT NULL,
      "assignedToId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  console.log("Creating TicketMessage table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TicketMessage" (
      "id" TEXT NOT NULL,
      "ticketId" TEXT NOT NULL,
      "bodyText" TEXT NOT NULL,
      "bodyHtml" TEXT,
      "senderType" TEXT NOT NULL,
      "senderId" TEXT,
      "messageId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  
  console.log("Adding unique constraint to TicketMessage messageId...");
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "TicketMessage_messageId_key" ON "TicketMessage"("messageId");
  `);

  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
