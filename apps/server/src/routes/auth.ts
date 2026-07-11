import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: () => process.env.NODE_ENV !== 'production'
});

router.use("/", limiter);
router.all("/*", toNodeHandler(auth));

export default router;
