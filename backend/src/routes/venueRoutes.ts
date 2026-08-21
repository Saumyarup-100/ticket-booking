import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { prisma } from '../db.js';

const router = Router();

router.post('/', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address } = req.body as { name: string; address: string };
    const venue = await prisma.venue.create({ data: { name, address } });
    res.status(201).json(venue);
  } catch (error) {
    res.status(500).json({ message: 'Error creating venue' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const venues = await prisma.venue.findMany();
    res.status(200).json(venues);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching venues' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: req.params['id'] as string },
      include: { 
        layouts: true, 
        categories: true, 
        seats: { 
          where: { isActive: true },
          include: { category: true } 
        } 
      }
    });
    res.status(200).json(venue);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching venue' });
  }
});

router.post('/:id/layout', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params['id'] as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layoutJson = req.body.layoutJson as any;
    const layout = await prisma.venueLayout.create({ data: { venueId, layoutJson } });
    res.status(201).json(layout);
  } catch (error) {
    res.status(500).json({ message: 'Error creating layout' });
  }
});

router.post('/:id/categories', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params['id'] as string;
    const { name, basePrice } = req.body as { name: string; basePrice: number };
    const category = await prisma.seatCategory.create({ data: { venueId, name, basePrice } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category' });
  }
});

router.post('/:id/seats', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response): Promise<void> => {
  try {
    const venueId = req.params['id'] as string;
    const { rows, cols, categoryMap } = req.body as {
      rows: number;
      cols: number;
      categoryMap: Record<string, string>;
    };

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { categories: true }
    });

    if (!venue || venue.categories.length === 0) {
      res.status(400).json({ message: 'Venue not found or has no categories. Create categories first.' });
      return;
    }

    const defaultCategoryId = venue.categories[0]!.id;

    // Archive previously active seats for this venue so historical bookings are preserved
    await prisma.seat.updateMany({
      where: { venueId, isActive: true },
      data: { isActive: false }
    });

    // Optionally delete only unused inactive seats that have no seatStatuses and no bookingSeats
    await prisma.seat.deleteMany({
      where: {
        venueId,
        isActive: false,
        seatStatuses: { none: {} },
        bookingSeats: { none: {} }
      }
    });

    // Create the brand new active seat geometry for future shows
    const seatsData = [];
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 0; c < cols; c++) {
        const categoryId = (categoryMap && (categoryMap[`${r}_${c}`] ?? categoryMap[String(r)])) ?? defaultCategoryId;
        seatsData.push({ 
          venueId, 
          categoryId, 
          seatLabel: `${rowLabel}${c + 1}`, 
          row: r, 
          col: c,
          isActive: true
        });
      }
    }

    await prisma.seat.createMany({ data: seatsData });

    const existingLayout = await prisma.venueLayout.findFirst({ where: { venueId } });
    const layoutJson = { rows, cols, categoryMap: categoryMap ?? {} };
    if (existingLayout) {
      await prisma.venueLayout.update({ where: { id: existingLayout.id }, data: { layoutJson } });
    } else {
      await prisma.venueLayout.create({ data: { venueId, layoutJson } });
    }

    res.status(201).json({ 
      message: `${seatsData.length} seats updated for new events! Previous show histories remain preserved.`, 
      count: seatsData.length 
    });
  } catch (error) {
    console.error('Error generating seats:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Error generating seats' 
    });
  }
});

export default router;
