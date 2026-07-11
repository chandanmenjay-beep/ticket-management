import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // src -> server -> apps -> root

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { auth } from './lib/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());

import authRoute from './routes/auth';
import usersRoute from './routes/users';
import webhooksRoute from './routes/webhooks';
import ticketsRoute from './routes/tickets';
import aiRoute from './routes/ai';

app.use("/api/auth", authRoute);
app.use("/api/users", usersRoute);
app.use("/api/webhooks", webhooksRoute);
app.use("/api/tickets", ticketsRoute);
app.use("/api/ai", aiRoute);

app.get('/', (req, res) => {
  res.json({ message: 'Ticket Management API is running' });
});

import { startBoss } from './lib/boss';

startBoss().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(console.error);
