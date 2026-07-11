import { Request, Response } from 'express';
import { prisma, auth } from '../lib/auth';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { banReason: null },
          { banReason: { not: 'deleted' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: { name, email, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    if (password && password.trim().length >= 8) {
      try {
        await auth.api.adminUpdateUser({
          headers: new Headers(req.headers as any),
          body: {
            userId: id,
            data: { password }
          }
        });
      } catch (err: any) {
        console.error('Failed to set user password via auth.api', err);
      }
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userToDelete = await prisma.user.findUnique({
      where: { id: id as string },
      select: { role: true }
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userToDelete.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete an admin user' });
    }

    // Soft delete by banning the user
    await prisma.user.update({
      where: { id: id as string },
      data: { 
        banned: true,
        banReason: 'deleted' 
      }
    });

    // Also revoke their sessions
    await prisma.session.deleteMany({
      where: { userId: id as string }
    });

    // Unassign any tickets assigned to this user
    await prisma.ticket.updateMany({
      where: { assignedToId: id as string },
      data: { assignedToId: null }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
