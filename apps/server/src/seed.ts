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

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
