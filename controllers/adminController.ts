import { Request, Response } from 'express';

export const getAdminDashboard = (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Admin Dashboard!' });
};

export const manageUsers = (req: Request, res: Response) => {
  res.json({ message: 'User management endpoint (admin only)' });
};
