import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { auth } from './apps/server/src/lib/auth.js';
import axios from 'axios';

async function test() {
  console.log("Creating test user and session...");
  let userId = 'test_agent_ai';
  const { prisma } = await import('./apps/server/src/lib/auth.js');
  
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: 'Test Agent AI',
      email: 'testagentai@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'agent'
    }
  });

  const token = 'test-token-ai-' + Date.now();
  await prisma.session.create({
    data: {
      id: token,
      token: token,
      userId: userId,
      expiresAt: new Date(Date.now() + 1000000),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log("Calling API directly bypassing Express to test AI...");
  const { polishText } = await import('./apps/server/src/controllers/ai.controller.js');
  
  let resData = null;
  const req = {
    body: { text: "yeah i will fix this soon" }
  };
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log("STATUS:", code, "DATA:", data);
        resData = data;
      }
    }),
    json: (data) => {
      console.log("SUCCESS DATA:", data);
      resData = data;
    }
  };

  try {
    await polishText(req, res);
  } catch (e) {
    console.error("Caught error:", e);
  }
}
test();
