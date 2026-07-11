import { PgBoss } from 'pg-boss';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable';

export const boss = new PgBoss(connectionString);

import { classifyTicketJob } from '../jobs/classify-ticket';

// We should export an init function to start the boss and register workers
export async function startBoss() {
  boss.on('error', (error) => console.error('pg-boss error:', error));

  await boss.start();
  console.log('pg-boss started');
  
  await boss.createQueue('classify-ticket');
  await boss.work('classify-ticket', classifyTicketJob as any);
  console.log('pg-boss workers registered');
}
