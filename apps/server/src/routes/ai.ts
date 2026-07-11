import { Router, Request, Response } from 'express';
import { polishText, summarizeTicket } from '../controllers/ai.controller';
import { auth } from '../lib/auth';

const router = Router();

// Require auth for AI route
const requireAuth = async (req: Request, res: Response, next: Function) => {
  const session = await auth.api.getSession({ headers: req.headers as HeadersInit });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/polish', requireAuth, polishText);
router.post('/summarize', requireAuth, summarizeTicket);

export default router;
