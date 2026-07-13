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

  // --- MOCK DATA GENERATION: Last 20 Days ---
  console.log("Generating 20 days of mock ticket data...");
  const agentUser = await prisma.user.findUnique({ where: { email: agentEmail } });
  
  if (agentUser) {
    const categories = ["general", "technical", "refund", "renewal"];
    const statuses = ["open", "pending", "resolved", "closed"];
    const customers = [
      { name: "John Doe", email: "john@example.com" },
      { name: "Jane Smith", email: "jane@example.com" },
      { name: "Bob Wilson", email: "bob@example.com" },
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

    const today = new Date();
    let ticketsCreated = 0;

    for (let i = 0; i < 20; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Create 1-3 tickets per day
      const numTickets = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numTickets; j++) {
        const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Randomly assign 70% of tickets to the agent
        const assignedToId = Math.random() > 0.3 ? agentUser.id : null;

        const ticket = await prisma.ticket.create({
          data: {
            subject: `Issue with ${category} - Day ${i} Ticket ${j}`,
            status,
            category,
            customerId: customer.id,
            assignedToId,
            createdAt: date,
            updatedAt: date,
          },
        });

        // Add 1-2 messages to each ticket
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            bodyText: `Hello, I need help with my ${category} issue.`,
            senderType: "CUSTOMER",
            senderId: customer.id,
            createdAt: date,
          }
        });

        if (status !== "open") {
          const replyDate = new Date(date);
          replyDate.setHours(replyDate.getHours() + 2); // Reply 2 hours later
          await prisma.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              bodyText: `We are looking into your ${category} issue.`,
              senderType: "AGENT",
              senderId: agentUser.id,
              createdAt: replyDate,
            }
          });
        }
        ticketsCreated++;
      }
    }
    console.log(`Successfully generated ${ticketsCreated} mock tickets across the last 20 days!`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
