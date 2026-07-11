import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { prisma } from './lib/auth';

async function main() {
  try {
    const existingAi = await prisma.user.findUnique({
      where: { email: 'ai@system.local' }
    });

    if (!existingAi) {
      await prisma.user.create({
        data: {
          id: 'ai_agent_1',
          name: 'AI',
          email: 'ai@system.local',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          role: 'agent'
        }
      });
      console.log('AI agent created successfully.');
    } else {
      console.log('AI agent already exists.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
