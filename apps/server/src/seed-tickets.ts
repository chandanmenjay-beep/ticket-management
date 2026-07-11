import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const subjects = [
  "Cannot log into my account",
  "Billing issue with last invoice",
  "How do I reset my password?",
  "Feature request: Dark mode",
  "App keeps crashing on startup",
  "Payment failed but card was charged",
  "Need help configuring SSO",
  "Where can I find the API documentation?",
  "Upgrade my subscription plan",
  "Downgrade my subscription plan",
  "Data export is taking too long",
  "Two-factor authentication not sending SMS",
  "UI glitch on the settings page",
  "Mobile app not syncing with web app",
  "Question about enterprise pricing",
  "Cancel my account",
  "Bug: Unable to upload profile picture",
  "Integrations page is returning 404",
  "Need to change email address",
  "Receipts are not being sent to accounting",
  "How to add a new team member?",
  "Getting 'Access Denied' error",
  "Custom domain setup help",
  "Webhooks are failing randomly",
  "Feedback: Great support team!",
  "Slow loading times on dashboard",
  "Cannot delete old projects",
  "Missing data in the weekly report",
  "Can I pause my subscription?",
  "Need a custom contract for our legal team"
];

const customerNames = [
  "Alice Smith", "Bob Johnson", "Charlie Brown", "Diana Prince", 
  "Evan Wright", "Fiona Gallagher", "George Costanza", "Hannah Abbott",
  "Ian Malcolm", "Julia Child", "Kevin McCallister", "Laura Palmer",
  "Michael Scott", "Nancy Wheeler", "Oliver Twist", "Pam Beesly",
  "Quentin Tarantino", "Rachel Green", "Steve Harrington", "Tony Stark"
];

const statuses = ['open', 'pending', 'resolved', 'closed'];
const priorities = ['low', 'normal', 'high', 'urgent'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedTickets() {
  try {
    console.log("Fetching agents...");
    const agents = await prisma.user.findMany({
      where: { role: { in: ['admin', 'agent'] } }
    });

    console.log("Creating 20 diverse customers...");
    const createdCustomers = [];
    for (let i = 0; i < 20; i++) {
      const name = customerNames[i];
      const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
      const customer = await prisma.customer.upsert({
        where: { email },
        update: {},
        create: { name, email }
      });
      createdCustomers.push(customer);
    }

    console.log("Generating 100 diverse tickets...");
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const ticketsData = [];
    for (let i = 0; i < 100; i++) {
      const isAssigned = Math.random() > 0.3; // 70% chance of being assigned
      const agent = isAssigned && agents.length > 0 ? randomChoice(agents) : null;
      
      const status = randomChoice(statuses);
      // Give higher priority to open/pending issues generally
      let priority = randomChoice(priorities);
      if (status === 'open' && Math.random() > 0.5) priority = randomChoice(['high', 'urgent']);
      
      const createdAt = randomDate(thirtyDaysAgo, now);
      // If resolved or closed, it should have a later updated time
      const updatedAt = (status === 'resolved' || status === 'closed') 
        ? randomDate(createdAt, now) 
        : createdAt;

      ticketsData.push({
        subject: randomChoice(subjects) + (Math.random() > 0.5 ? ` #${Math.floor(Math.random() * 1000)}` : ''),
        status,
        customerId: randomChoice(createdCustomers).id,
        assignedToId: agent ? agent.id : null,
        createdAt,
        updatedAt
      });
    }

    console.log("Inserting tickets into the database...");
    await prisma.ticket.createMany({
      data: ticketsData
    });

    // Create some initial messages for a few tickets
    console.log("Adding initial messages to tickets...");
    const createdTickets = await prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    
    for (const ticket of createdTickets) {
      if (Math.random() > 0.2) { // 80% chance to have an initial message
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            bodyText: `Customer message regarding: ${ticket.subject}. Please assist.`,
            senderType: 'CUSTOMER',
            senderId: ticket.customerId,
            createdAt: ticket.createdAt
          }
        });
      }
    }

    console.log("Successfully seeded 100 tickets!");
  } catch (error) {
    console.error("Error seeding tickets:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedTickets();
