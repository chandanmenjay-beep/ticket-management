import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
