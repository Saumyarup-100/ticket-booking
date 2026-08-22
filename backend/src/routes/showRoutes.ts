import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/authMiddleware.js';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import { io } from '../server.js';

const holdRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? 'unauthenticated',
  skip: () => false,
  message: { message: 'Too many seat hold requests, slow down.' }
});

const router = Router();

router.get('/:id/seats', async (req: Request, res: Response): Promise<void> => {
  try {
    const showId = req.params['id'] as string;
    const seatStatuses = await prisma.seatStatus.findMany({
      where: { showId },
      include: { seat: { include: { category: true } }, show: { include: { event: true, venue: true } } }
    });
    res.status(200).json(seatStatuses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seats' });
  }
});

router.post('/:id/seats/:seatId/hold', authenticate, holdRateLimit, async (req: AuthRequest, res: Response): Promise<void> => {
  const showId = req.params['id'] as string;
  const seatId = req.params['seatId'] as string;
  const userId = req.user!.id;
  const maxHolds = parseInt(process.env['MAX_HOLDS_PER_USER'] ?? '6');

  try {
    const holdResult = await prisma.$transaction(async (tx) => {
      const currentHolds = await tx.seatStatus.count({
        where: { showId, heldBy: userId, status: 'HELD' }
      });
      if (currentHolds >= maxHolds) throw new Error('Hold limit reached');

      const rows = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "SeatStatus"
        WHERE "showId" = ${showId} AND "seatId" = ${seatId}
        FOR UPDATE;
      `;

      if (!rows || rows.length === 0) throw new Error('Seat not found');
      if (rows[0]!.status !== 'AVAILABLE') throw new Error('Seat is not available');

      const holdExpiry = new Date();
      holdExpiry.setMinutes(holdExpiry.getMinutes() + parseInt(process.env['HOLD_TTL_MINUTES'] ?? '10'));

      return tx.seatStatus.update({
        where: { showId_seatId: { showId, seatId } },
        data: { status: 'HELD', heldBy: userId, holdExpiresAt: holdExpiry }
      });
    });

    io.to(`show_${showId}`).emit('seat:held', { 
      showId, 
      seatId, 
      status: 'HELD', 
      heldBy: userId,
      holdExpiresAt: holdResult.holdExpiresAt 
    });
    res.status(200).json({ message: 'Seat held successfully', hold: holdResult });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error holding seat';
    if (msg === 'Seat is not available') {
      res.status(409).json({ message: 'Seat is no longer available' });
    } else if (msg === 'Hold limit reached') {
      res.status(429).json({ message: `You can only hold up to ${parseInt(process.env['MAX_HOLDS_PER_USER'] ?? '6')} seats at a time.` });
    } else {
      res.status(500).json({ message: msg });
    }
  }
});

router.delete('/:id/seats/:seatId/hold', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const showId = req.params['id'] as string;
  const seatId = req.params['seatId'] as string;
  const userId = req.user!.id;

  try {
    await prisma.$transaction(async (tx) => {
      const seat = await tx.seatStatus.findUnique({ where: { showId_seatId: { showId, seatId } } });
      if (seat?.status === 'HELD' && seat.heldBy === userId) {
        await tx.seatStatus.update({
          where: { showId_seatId: { showId, seatId } },
          data: { status: 'AVAILABLE', heldBy: null, holdExpiresAt: null }
        });
      }
    });
    io.to(`show_${showId}`).emit('seat:released', { showId, seatId, status: 'AVAILABLE' });
    res.status(200).json({ message: 'Hold released' });
  } catch (error) {
    res.status(500).json({ message: 'Error releasing hold' });
  }
});

export default router;
