import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const agent = await prisma.user.findUnique({where: {email: 'agent@example.com'}});
  console.log("Agent role:", agent?.role);
  
  // also check if admin exists
  const admin = await prisma.user.findUnique({where: {email: 'admin@example.com'}});
  console.log("Admin role:", admin?.role);
  process.exit(0);
}
main();
