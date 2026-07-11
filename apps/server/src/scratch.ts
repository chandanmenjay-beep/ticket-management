import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function checkTicket() {
  const prisma = new PrismaClient();

  console.log("Fetching tickets...");
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { messages: true }
  });

  if (tickets.length === 0) {
    console.log("No tickets found.");
  } else {
    const t = tickets[0];
    console.log(`Ticket: ${t.subject} (ID: ${t.id})`);
    console.log(`Status: ${t.status}, Category: ${t.category}`);
    console.log("Messages:");
    for (const m of t.messages) {
      console.log(`- [${m.senderType}]: ${m.bodyText}`);
    }
  }

  process.exit(0);
}
checkTicket();
