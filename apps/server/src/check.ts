import { prisma } from './lib/auth.js';

async function check() {
  const ticket = await prisma.ticket.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { customer: true }
  });
  console.log(JSON.stringify(ticket, null, 2));
  process.exit(0);
}

check();
