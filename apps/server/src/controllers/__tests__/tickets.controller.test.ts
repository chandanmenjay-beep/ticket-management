import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { Request, Response } from 'express';

// Mock the prisma dependency before importing the controller
const mockPrisma = {
  user: {
    findUnique: mock(),
  },
  ticket: {
    update: mock(),
  }
};

mock.module('../../lib/auth', () => ({
  prisma: mockPrisma
}));

import { updateTicket } from '../tickets.controller';

describe('updateTicket controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof mock>;
  let statusMock: ReturnType<typeof mock>;

  beforeEach(() => {
    jsonMock = mock();
    statusMock = mock().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      params: { id: 'ticket_123' },
      body: {}
    };
    
    mockRes = {
      json: jsonMock,
      status: statusMock
    };

    // Reset mocks
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.ticket.update.mockReset();
  });

  it('should successfully update ticket status and category', async () => {
    mockReq.body = { status: 'resolved', category: 'refund' };
    
    const mockUpdatedTicket = { id: 'ticket_123', status: 'resolved', category: 'refund' };
    mockPrisma.ticket.update.mockResolvedValue(mockUpdatedTicket);

    await updateTicket(mockReq as Request, mockRes as Response);

    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket_123' },
      data: { status: 'resolved', category: 'refund' },
      include: expect.any(Object)
    });
    expect(jsonMock).toHaveBeenCalledWith(mockUpdatedTicket);
  });

  it('should return 400 if assignedToId is provided but user does not exist', async () => {
    mockReq.body = { assignedToId: 'invalid_user' };
    
    // Simulate user not found
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await updateTicket(mockReq as Request, mockRes as Response);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'invalid_user' }
    });
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid user ID' });
    expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
  });

  it('should successfully assign ticket if valid user is provided', async () => {
    mockReq.body = { assignedToId: 'valid_agent' };
    
    // Simulate user exists
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'valid_agent', name: 'Agent Smith' });
    
    const mockUpdatedTicket = { id: 'ticket_123', assignedToId: 'valid_agent' };
    mockPrisma.ticket.update.mockResolvedValue(mockUpdatedTicket);

    await updateTicket(mockReq as Request, mockRes as Response);

    expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket_123' },
      data: { assignedToId: 'valid_agent' },
      include: expect.any(Object)
    });
    expect(jsonMock).toHaveBeenCalledWith(mockUpdatedTicket);
  });

  it('should successfully unassign a ticket when assignedToId is explicitly null', async () => {
    // Frontend passes null to unassign
    mockReq.body = { assignedToId: null };
    
    const mockUpdatedTicket = { id: 'ticket_123', assignedToId: null };
    mockPrisma.ticket.update.mockResolvedValue(mockUpdatedTicket);

    await updateTicket(mockReq as Request, mockRes as Response);

    // Should NOT call findUnique if assignedToId is null (falsy)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket_123' },
      data: { assignedToId: null },
      include: expect.any(Object)
    });
    expect(jsonMock).toHaveBeenCalledWith(mockUpdatedTicket);
  });

  it('should return 500 if database query fails', async () => {
    mockReq.body = { status: 'closed' };
    
    // Simulate DB failure
    mockPrisma.ticket.update.mockRejectedValue(new Error('DB Connection Lost'));

    await updateTicket(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to update ticket' });
  });
});
