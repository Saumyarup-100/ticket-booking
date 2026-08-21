import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: { id: string; role: Role };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ message: 'Unauthorized: No token provided' }); return; }

  try {
    const decoded = jwt.verify(token, process.env['JWT_SECRET'] ?? 'supersecretjwtkey') as { id: string; role: Role };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

export const authorize = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
