import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

async function main() {
  let connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
  if (process.env.NODE_ENV === "test" || process.env.DATABASE_URL?.includes("template1_test")) {
    connectionString = "postgres://postgres:postgres@localhost:51214/template1_test";
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Create a localized auth instance where signup is ENABLED so we can seed
  const seedAuth = betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false, // Ensure we can sign up the admin
    },
    plugins: [
      admin(),
    ],
  });

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  // Seed admin user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Updating role to admin.`);
    await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });
    console.log("Admin user role updated successfully!");
  } else {
    console.log(`Creating admin user: ${email}...`);
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    const response = await seedAuth.api.signUpEmail({
      body: {
        name: "Admin",
        email: email,
        password: password,
      },
      asResponse: true,
    });

    if (!response || !response.ok) {
      console.error("Failed to seed admin user");
      console.error(await response?.text());
      process.exit(1);
    }
    
    // Set role to admin via Prisma
    await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });
    console.log("Admin user seeded successfully!");
  }

  // Seed agent user
  const agentEmail = "agent@example.com";
  const existingAgent = await prisma.user.findUnique({
    where: { email: agentEmail },
  });

  if (existingAgent) {
    console.log(`User ${agentEmail} already exists. Updating role to agent.`);
    await prisma.user.update({
      where: { email: agentEmail },
      data: { role: "agent" },
    });
    console.log("Agent user role updated successfully!");
  } else {
    console.log(`Creating agent user: ${agentEmail}...`);
    const agentResponse = await seedAuth.api.signUpEmail({
      body: {
        name: "Agent",
        email: agentEmail,
        password: password, // Use same password for testing
      },
      asResponse: true,
    });

    if (!agentResponse || !agentResponse.ok) {
      console.error("Failed to seed agent user");
      console.error(await agentResponse?.text());
      process.exit(1);
    }
    
    // Set role to agent via Prisma
    await prisma.user.update({
      where: { email: agentEmail },
      data: { role: "agent" },
    });
    console.log("Agent user seeded successfully!");
  }

  // --- MOCK DATA GENERATION: 30 Tickets for Today (Including AI Resolved) ---
  console.log("Generating 30 mock tickets for today...");
  const agentUser = await prisma.user.findUnique({ where: { email: agentEmail } });
  
  if (agentUser) {
    const categories = ["general", "technical", "refund", "renewal"];
    const statuses = ["open", "pending", "resolved", "closed"];
    const customers = [
      { name: "John Doe", email: "john@example.com" },
      { name: "Jane Smith", email: "jane@example.com" },
      { name: "Bob Wilson", email: "bob@example.com" },
      { name: "Alice Brown", email: "alice@example.com" },
      { name: "Charlie Davis", email: "charlie@example.com" },
    ];

    // Create customers
    const createdCustomers = [];
    for (const c of customers) {
      const dbCustomer = await prisma.customer.upsert({
        where: { email: c.email },
        update: {},
        create: c,
      });
      createdCustomers.push(dbCustomer);
    }

    // Generate tickets for exactly June 29th (current year)
    const targetDate = new Date();
    targetDate.setMonth(5); // June (0-indexed)
    targetDate.setDate(29);
    targetDate.setHours(10, 0, 0, 0); // Start at 10 AM

    let ticketsCreated = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(targetDate);
      // Stagger them slightly throughout today
      date.setMinutes(date.getMinutes() - (i * 15));
      
      const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      // We want some to be AI resolved.
      // Let's make ~30% AI resolved, ~40% Agent resolved/pending, ~30% open
      const randomVal = Math.random();
      let status = "open";
      let isAiResolved = false;
      let assignedToId = null;

      if (randomVal < 0.3) {
        status = "resolved";
        isAiResolved = true;
      } else if (randomVal < 0.7) {
        status = Math.random() > 0.5 ? "resolved" : "pending";
        assignedToId = agentUser.id; // assigned to human agent
      } else {
        status = "open";
      }

      const ticket = await prisma.ticket.create({
        data: {
          subject: `Help with ${category} (Ticket #${i + 1})`,
          status,
          category,
          customerId: customer.id,
          assignedToId,
          createdAt: date,
          updatedAt: date,
        },
      });

      // Customer's initial message
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          bodyText: `Hello, I need some help regarding my ${category}. Can you please assist?`,
          senderType: "CUSTOMER",
          senderId: customer.id,
          createdAt: date,
        }
      });

      const replyDate = new Date(date);
      replyDate.setMinutes(replyDate.getMinutes() + 5);

      if (isAiResolved) {
        // AI response
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            bodyText: `I am the AI Assistant. I have analyzed your request regarding ${category} and applied the necessary fixes to your account. Your issue is now resolved.`,
            senderType: "AI",
            senderId: null, // No specific user ID for AI
            createdAt: replyDate,
          }
        });
      } else if (status !== "open") {
        // Human agent response
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            bodyText: `Hello! I am looking into your ${category} issue right now.`,
            senderType: "AGENT",
            senderId: agentUser.id,
            createdAt: replyDate,
          }
        });
      }
      
      ticketsCreated++;
    }
    console.log(`Successfully generated ${ticketsCreated} mock tickets for today!`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
