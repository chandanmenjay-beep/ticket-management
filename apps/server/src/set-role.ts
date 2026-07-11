import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.update({
    where: { email: 'agent@example.com' },
    data: { role: 'user' }
  });
  console.log("Updated agent role to user");
  process.exit(0);
}
main();
