import { Router, Request, Response } from 'express';
import { auth, prisma } from '../lib/auth';
import { toNodeHandler } from 'better-auth/node';

const router = Router();

// Middleware to check if user is admin or agent
const requireAdminOrAgent = async (req: Request, res: Response, next: Function) => {
  const session = await auth.api.getSession({ headers: req.headers as HeadersInit });
  if (!session || !['admin', 'agent'].includes((session.user as any).role)) {
    return res.status(403).json({ error: 'Unauthorized: Access denied' });
  }
  next();
};

import { getUsers, updateUser, deleteUser } from '../controllers/users.controller';

// Require pure admin for mutating users
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  const session = await auth.api.getSession({ headers: req.headers as HeadersInit });
  if (!session || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admins only' });
  }
  next();
};

router.get('/', requireAdminOrAgent, getUsers);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);

export default router;
