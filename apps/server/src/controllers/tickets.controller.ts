import { Request, Response } from 'express';
import xss from 'xss';
import { prisma, auth } from '../lib/auth';

export const getTickets = async (req: Request, res: Response) => {
  try {
    const { sortField, sortOrder, search, status, category, page = '1', limit = '10' } = req.query;
    
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    let orderBy: any = { createdAt: 'desc' }; // default
    
    if (typeof sortField === 'string' && typeof sortOrder === 'string') {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      
      if (['subject', 'status', 'category', 'createdAt'].includes(sortField)) {
        orderBy = { [sortField]: order };
      } else if (sortField === 'customer') {
        orderBy = { customer: { name: order } };
      }
    }

    let where: any = {};
    if (typeof status === 'string' && status !== 'all') {
      where.status = status;
    }
    if (typeof category === 'string' && category !== 'all') {
      where.category = category;
    }
    if (typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limitNumber,
        include: {
          customer: {
            select: { name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy
      }),
      prisma.ticket.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json({
      data: tickets,
      totalCount,
      page: pageNumber,
      limit: limitNumber,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getTicketStats = async (req: Request, res: Response) => {
  try {
    const totalTickets = await prisma.ticket.count();
    const openTickets = await prisma.ticket.count({ where: { status: 'open' } });
    
    const ticketsResolvedByAi = await prisma.ticket.count({
      where: {
        status: 'resolved',
        messages: {
          some: {
            senderType: 'AGENT',
            senderId: null,
          }
        }
      }
    });

    const percentResolvedByAi = totalTickets > 0 ? ((ticketsResolvedByAi / totalTickets) * 100).toFixed(2) : 0;

    const resolvedTickets = await prisma.ticket.findMany({
      where: { status: 'resolved' },
      select: { createdAt: true, updatedAt: true }
    });

    let avgResolutionTimeHours = 0;
    if (resolvedTickets.length > 0) {
      const totalTimeMs = resolvedTickets.reduce((acc, t) => acc + (t.updatedAt.getTime() - t.createdAt.getTime()), 0);
      avgResolutionTimeHours = (totalTimeMs / resolvedTickets.length) / (1000 * 60 * 60);
    }

    res.json({
      totalTickets,
      openTickets,
      ticketsResolvedByAi,
      percentResolvedByAi,
      avgResolutionTimeHours: avgResolutionTimeHours.toFixed(2),
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ error: 'Failed to fetch ticket stats' });
  }
};

export const getTicketChartData = async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNumber = parseInt(days as string, 10);
    
    // Calculate the start date based on the number of days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNumber);
    startDate.setHours(0, 0, 0, 0);

    // Get all tickets created in this timeframe
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        status: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by day (YYYY-MM-DD)
    const groupedData: Record<string, { date: string, created: number, resolved: number }> = {};
    
    // Initialize all days in range to 0
    for (let i = 0; i < daysNumber; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      groupedData[dateString] = { date: dateString, created: 0, resolved: 0 };
    }

    // Populate data
    tickets.forEach(t => {
      const dateString = t.createdAt.toISOString().split('T')[0];
      if (groupedData[dateString]) {
        groupedData[dateString].created += 1;
        if (t.status === 'resolved' || t.status === 'closed') {
          groupedData[dateString].resolved += 1;
        }
      }
    });

    res.json(Object.values(groupedData));
  } catch (error) {
    console.error('Error fetching ticket chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: id as string },
      include: {
        customer: {
          select: { name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            // Can't reliably join User and Customer cleanly with a generic senderId in one step, 
            // but we can just return the raw messages for now since senderType differentiates it.
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket by ID:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedToId, status, category } = req.body;

    if (assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!user) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id: id as string },
      data: {
        ...(assignedToId !== undefined && { assignedToId }),
        ...(status !== undefined && { status }),
        ...(category !== undefined && { category }),
      },
      include: {
        customer: {
          select: { name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

export const addTicketMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bodyText } = req.body;
    
    // We should get the user from the session
    const session = await auth.api.getSession({ headers: req.headers as HeadersInit });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!bodyText || bodyText.trim() === '') {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id as string,
        bodyText: xss(bodyText),
        senderType: 'AGENT',
        senderId: session.user.id
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding ticket message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
};

export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await auth.api.getSession({ headers: req.headers as HeadersInit });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only admins can delete tickets' });
    }

    await prisma.ticket.delete({
      where: { id: id as string }
    });

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};
