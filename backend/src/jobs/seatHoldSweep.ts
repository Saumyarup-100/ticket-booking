import { prisma } from '../db.js';
import { io } from '../server.js';

export const startSeatHoldSweep = () => {
  setInterval(async () => {
    try {
      const expiredHolds = await prisma.seatStatus.findMany({
        where: { status: 'HELD', holdExpiresAt: { lt: new Date() } }
      });

      if (expiredHolds.length > 0) {
        await prisma.seatStatus.updateMany({
          where: { id: { in: expiredHolds.map(h => h.id) } },
          data: { status: 'AVAILABLE', heldBy: null, holdExpiresAt: null }
        });

        for (const hold of expiredHolds) {
          io.to(`show_${hold.showId}`).emit('seat:released', { showId: hold.showId, seatId: hold.seatId, status: 'AVAILABLE' });
        }

        console.log(`Released ${expiredHolds.length} expired seat holds.`);
      }
    } catch (error) {
      console.error('Error in seat hold sweep:', error);
    }
  }, 15000);
};
