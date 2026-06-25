import express from 'express';
import cors from 'cors';
import { auth } from './lib/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());

import { toNodeHandler } from "better-auth/node";

// Mount Better Auth
app.all("/api/auth/*", toNodeHandler(auth));

app.get('/', (req, res) => {
  res.json({ message: 'Ticket Management API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
