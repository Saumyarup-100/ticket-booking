import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../db.js';

const router = Router();

router.post('/', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const organiserId = req.user!.id;
    const event = await prisma.event.create({ data: { name, description: description ?? null, organiserId } });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error creating event' });
  }
});

router.post('/:id/shows', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params['id'] as string;
    const { venueId, date, time } = req.body as { venueId: string; date: string; time: string };
    const show = await prisma.show.create({ data: { eventId, venueId, date: new Date(date), time } });

    const seats = await prisma.seat.findMany({ where: { venueId, isActive: true } });
    if (seats.length > 0) {
      await prisma.seatStatus.createMany({
        data: seats.map(seat => ({ showId: show.id, seatId: seat.id, status: 'AVAILABLE' as const }))
      });
    }

    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ message: 'Error creating show', error });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query['search'] as string | undefined;
    const venueId = req.query['venueId'] as string | undefined;
    const where: Record<string, unknown> = {};
    if (search) where['name'] = { contains: search, mode: 'insensitive' };
    if (venueId) where['shows'] = { some: { venueId } };

    const events = await prisma.event.findMany({
      where,
      include: { shows: { include: { venue: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params['id'] as string },
      include: { shows: { include: { venue: true } } }
    });
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event' });
  }
});

router.get('/:id/summary', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eventId = req.params['id'] as string;
    const bookings = await prisma.booking.findMany({
      where: { show: { eventId }, status: 'CONFIRMED' },
      include: { seats: true }
    });

    const revenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const seatsSold = bookings.reduce((sum, b) => sum + b.seats.length, 0);

    res.status(200).json({ revenue, seatsSold, totalBookings: bookings.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

export default router;
