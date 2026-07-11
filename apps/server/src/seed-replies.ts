import { prisma } from './lib/auth.js';

async function generateReplies() {
  console.log('Fetching all tickets...');
  const tickets = await prisma.ticket.findMany({
    include: {
      customer: true
    }
  });

  console.log(`Found ${tickets.length} tickets.`);

  if (tickets.length === 0) {
    console.log('No tickets found. Please create a ticket first.');
    return;
  }

  console.log('Fetching an agent...');
  const agent = await prisma.user.findFirst({
    where: {
      role: { in: ['admin', 'agent'] }
    }
  });

  if (!agent) {
    console.log('No admin/agent found in the database. Creating one...');
    // Create dummy agent if needed
  }
  
  const agentId = agent ? agent.id : 'fallback-agent-id';

  console.log('Generating 50 long replies for each ticket...');

  for (const ticket of tickets) {
    console.log(`Processing ticket: ${ticket.id}`);
    
    // Create 50 messages
    for (let i = 1; i <= 50; i++) {
      const isCustomer = i % 2 !== 0; // Odd indices = Customer, Even = Agent
      const senderType = isCustomer ? 'CUSTOMER' : 'AGENT';
      const senderId = isCustomer ? ticket.customerId : agentId;

      // Generate 20 lines of text
      let bodyText = `This is message number ${i} in the thread.\n\n`;
      for (let line = 1; line <= 20; line++) {
        if (isCustomer) {
          bodyText += `Customer line ${line}: I am still experiencing issues and need more help regarding the current situation.\n`;
        } else {
          bodyText += `Agent line ${line}: We are looking into this issue and working hard to resolve it for you as quickly as possible.\n`;
        }
      }

      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          bodyText,
          senderType,
          senderId,
          // Stagger the creation time so they appear in order
          createdAt: new Date(Date.now() - (50 - i) * 60000) 
        }
      });
    }
    console.log(`Created 50 messages for ticket ${ticket.id}.`);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

generateReplies().catch(e => {
  console.error(e);
  process.exit(1);
});
