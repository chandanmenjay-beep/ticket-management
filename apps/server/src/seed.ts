import * as dotenv from "dotenv";
dotenv.config({ path: "../../server/.env" });

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";

async function main() {
  const connectionString = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
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

  // Check if admin already exists
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
    process.exit(0);
  }

  console.log(`Creating admin user: ${email}...`);

  // We must pass headers so Better Auth treats this as a valid request.
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  // Call the signup API programmatically
  const response = await seedAuth.api.signUpEmail({
    body: {
      name: "Admin",
      email: email,
      password: password,
      role: "admin", // override default role
    },
    asResponse: true,
  });

  if (!response || !response.ok) {
    console.error("Failed to seed admin user");
    console.error(await response?.text());
    process.exit(1);
  }

  console.log("Admin user seeded successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
