import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  earlyAccess: true,
  schema: '../../server/prisma/schema.prisma',
  migrate: {
    url: process.env.DATABASE_URL!
  },
  datasource: {
    url: process.env.DATABASE_URL!
  }
});
