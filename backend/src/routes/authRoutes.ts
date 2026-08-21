import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const router = Router();
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'supersecretjwtkey';

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as { name: string; email: string; password: string; role?: string };
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) { res.status(400).json({ message: 'Email already exists' }); return; }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: (role as any) ?? 'CUSTOMER' }
    });
    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.status(401).json({ message: 'Invalid credentials' }); return; }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) { res.status(401).json({ message: 'Invalid credentials' }); return; }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
