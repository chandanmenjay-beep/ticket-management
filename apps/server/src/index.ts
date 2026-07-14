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
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
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

// Serve client app statically in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('/api/health', (req, res) => {
  res.json({ message: 'Ticket Management API is running' });
});

// Fallback for SPA routing - serve index.html for unknown routes (excluding /api)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

import { startBoss } from './lib/boss';
import { startImapListener } from './lib/imap';

startBoss().then(() => {
  startImapListener();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(console.error);
