import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/authMiddleware.js';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { getTransporter, isEthereal, fromAddress } from '../config/mailer.js';
import { io } from '../server.js';
import { assignWaitlist } from '../jobs/waitlistAssigner.js';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { showId } = req.body as { showId: string };

  try {
    const bookingResult = await prisma.$transaction(async (tx) => {
      const heldSeats = await tx.$queryRaw<Array<{ id: string; seatId: string; basePrice: number }>>`
        SELECT ss.id, ss."seatId", sc."basePrice"
        FROM "SeatStatus" ss
        JOIN "Seat" s ON s.id = ss."seatId"
        JOIN "SeatCategory" sc ON sc.id = s."categoryId"
        WHERE ss."showId" = ${showId} AND ss."heldBy" = ${userId} AND ss.status = 'HELD'
        FOR UPDATE;
      `;

      if (heldSeats.length === 0) throw new Error('No held seats found to book.');

      const totalAmount = heldSeats.reduce((sum, s) => sum + Number(s.basePrice), 0);
      const bookingReference = Math.random().toString(36).substring(2, 10).toUpperCase();

      const booking = await tx.booking.create({
        data: {
          showId,
          userId,
          totalAmount,
          bookingReference,
          seats: { create: heldSeats.map(hs => ({ seatId: hs.seatId })) }
        },
        include: { show: { include: { event: true, venue: true } }, user: true }
      });

      await tx.seatStatus.updateMany({
        where: { showId, heldBy: userId, status: 'HELD' },
        data: { status: 'BOOKED', holdExpiresAt: null }
      });

      return { booking, heldSeats };
    });

    const { booking, heldSeats } = bookingResult;

    heldSeats.forEach(hs => {
      io.to(`show_${showId}`).emit('seat:booked', { showId, seatId: hs.seatId, status: 'BOOKED' });
    });

    // Send email — never let a failed email break a confirmed booking
    let emailPreviewUrl: string | null = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(booking.bookingReference);
      const qrBase64 = qrDataUrl.split(',')[1] ?? '';
      const mailer = await getTransporter();
      const info = await mailer.sendMail({
        from: `"Ticket Booking" <${fromAddress}>`,
        to: booking.user.email,
        subject: `Booking Confirmed: ${booking.show.event.name}`,
        html: `
          <h1>Booking Confirmed!</h1>
          <p><strong>Reference:</strong> ${booking.bookingReference}</p>
          <p><strong>Show:</strong> ${booking.show.event.name} at ${booking.show.venue.name}</p>
          <p><strong>Date:</strong> ${new Date(booking.show.date).toLocaleDateString()} at ${booking.show.time}</p>
          <p><strong>Total:</strong> ₹${booking.totalAmount.toFixed(2)}</p>
          <p>Present this QR code at the venue:</p>
          <img src="cid:qrcode" alt="QR Code" />
        `,
        attachments: [{ filename: 'ticket-qr.png', content: qrBase64, encoding: 'base64', cid: 'qrcode' }]
      });
      if (isEthereal) {
        emailPreviewUrl = nodemailer.getTestMessageUrl(info) || null;
        if (emailPreviewUrl) console.log('📧 Email preview:', emailPreviewUrl);
      }
    } catch (emailErr) {
      console.error('Email failed (booking still confirmed):', emailErr);
    }

    res.status(201).json({ message: 'Booking confirmed', booking, emailPreviewUrl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error creating booking';
    res.status(400).json({ message: msg });
  }
});

router.get('/holds', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const heldSeats = await prisma.seatStatus.findMany({
      where: { heldBy: req.user!.id, status: 'HELD' },
      include: { show: { include: { event: true, venue: true } }, seat: { include: { category: true } } }
    });
    res.status(200).json(heldSeats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching holds' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      include: { show: { include: { event: true, venue: true } }, seats: { include: { seat: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params['id'] as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId: req.user!.id },
      include: { seats: { include: { seat: true } } }
    });

    if (!booking || booking.status === 'CANCELLED') {
      res.status(400).json({ message: 'Booking not found or already cancelled' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
      await tx.seatStatus.updateMany({
        where: { showId: booking.showId, seatId: { in: booking.seats.map(s => s.seatId) } },
        data: { status: 'AVAILABLE', heldBy: null, holdExpiresAt: null }
      });
    });

    booking.seats.forEach(bs => {
      io.to(`show_${booking.showId}`).emit('seat:released', { showId: booking.showId, seatId: bs.seatId, status: 'AVAILABLE' });
    });

    res.status(200).json({ message: 'Booking cancelled successfully' });

    for (const bs of booking.seats) {
      await assignWaitlist(booking.showId, bs.seat.categoryId, bs.seatId);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling booking' });
  }
});

export default router;
