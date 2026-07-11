import { Router } from 'express';
import { getTickets, getTicketStats, getTicketChartData, getTicketById, updateTicket, addTicketMessage } from '../controllers/tickets.controller';
import { prisma } from '../lib/auth';

const router = Router();

router.get('/', getTickets);
router.get('/stats', getTicketStats);
router.get('/chart', getTicketChartData);
router.get('/:id', getTicketById);
router.patch('/:id', updateTicket);
router.post('/:id/messages', addTicketMessage);

export default router;
