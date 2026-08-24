import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/authMiddleware.js';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { getTransporter, isEthereal, fromAddress } from '../config/mailer.js';
import { io } from '../server.js';

const router = Router();

router.post('/shows/:id/waitlist', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.body as { categoryId: string };
    const showId = req.params['id'] as string;
    const customerId = req.user!.id;

    const existing = await prisma.waitlist.findFirst({
      where: { showId, categoryId, customerId, status: { in: ['WAITING', 'OFFERED'] } }
    });
    if (existing) { res.status(409).json({ message: 'Already on waitlist for this category' }); return; }

    const waitlist = await prisma.waitlist.create({ data: { showId, categoryId, customerId } });
    res.status(201).json({ message: 'Joined waitlist successfully', waitlist });
  } catch (error) {
    res.status(500).json({ message: 'Error joining waitlist' });
  }
});

router.get('/offers/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const offer = await prisma.waitlist.findUnique({
      where: { offerToken: req.params['token'] as string },
      include: { show: { include: { event: true, venue: true } }, category: true }
    });

    if (!offer || offer.status !== 'OFFERED' || !offer.offerExpiresAt || offer.offerExpiresAt < new Date()) {
      res.status(404).json({ message: 'Offer invalid or expired' });
      return;
    }

    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offer' });
  }
});

router.post('/offers/:token/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const offer = await prisma.waitlist.findUnique({
      where: { offerToken: req.params['token'] as string },
      include: { show: { include: { event: true, venue: true } }, category: true, customer: true }
    });

    if (!offer || offer.status !== 'OFFERED' || offer.customerId !== req.user!.id) {
      res.status(400).json({ message: 'Invalid or expired offer' });
      return;
    }
    if (offer.offerExpiresAt && offer.offerExpiresAt < new Date()) {
      res.status(410).json({ message: 'Offer has expired' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const heldSeats = await tx.$queryRaw<Array<{ id: string; seatId: string; basePrice: number }>>`
        SELECT ss.id, ss."seatId", sc."basePrice"
        FROM "SeatStatus" ss
        JOIN "Seat" s ON s.id = ss."seatId"
        JOIN "SeatCategory" sc ON sc.id = s."categoryId"
        WHERE ss."showId" = ${offer.showId} AND ss."heldBy" = ${offer.customerId} AND ss.status = 'HELD'
        FOR UPDATE
        LIMIT 1;
      `;

      if (heldSeats.length === 0) throw new Error('Held seat not found for this offer');
      const seat = heldSeats[0]!;

      const bookingReference = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newBooking = await tx.booking.create({
        data: {
          showId: offer.showId,
          userId: offer.customerId,
          totalAmount: Number(seat.basePrice),
          bookingReference,
          seats: { create: [{ seatId: seat.seatId }] }
        },
        include: { show: { include: { event: true, venue: true } }, user: true }
      });

      await tx.seatStatus.update({
        where: { id: seat.id },
        data: { status: 'BOOKED', holdExpiresAt: null }
      });
      await tx.waitlist.update({ where: { id: offer.id }, data: { status: 'BOOKED' } });

      return { newBooking, seatId: seat.seatId };
    });

    io.to(`show_${offer.showId}`).emit('seat:booked', { showId: offer.showId, seatId: result.seatId, status: 'BOOKED' });

    let emailPreviewUrl: string | null = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(result.newBooking.bookingReference);
      const qrBase64 = qrDataUrl.split(',')[1] ?? '';
      const mailer = await getTransporter();
      const info = await mailer.sendMail({
        from: `"Ticket Booking" <${fromAddress}>`,
        to: offer.customer.email,
        subject: `Booking Confirmed: ${offer.show.event.name}`,
        html: `
          <h1>Booking Confirmed!</h1>
          <p><strong>Reference:</strong> ${result.newBooking.bookingReference}</p>
          <p><strong>Show:</strong> ${offer.show.event.name} at ${offer.show.venue.name}</p>
          <p><strong>Total:</strong> ₹${result.newBooking.totalAmount.toFixed(2)}</p>
          <img src="cid:qrcode" alt="QR Code" />
        `,
        attachments: [{ filename: 'ticket-qr.png', content: qrBase64, encoding: 'base64', cid: 'qrcode' }]
      });
      if (isEthereal) emailPreviewUrl = nodemailer.getTestMessageUrl(info) || null;
    } catch (emailErr) {
      console.error('Email failed (booking still confirmed):', emailErr);
    }

    res.status(201).json({ message: 'Booking confirmed from waitlist offer', booking: result.newBooking, emailPreviewUrl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error confirming offer';
    res.status(500).json({ message: msg });
  }
});

export default router;
