import { prisma } from '../db.js';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import { getTransporter, isEthereal, fromAddress } from '../config/mailer.js';
import { io } from '../server.js';

export const assignWaitlist = async (showId: string, categoryId: string, seatId: string) => {
  try {
    const nextInLine = await prisma.waitlist.findFirst({
      where: { showId, categoryId, status: 'WAITING' },
      orderBy: { joinedAt: 'asc' },
      include: { customer: true, show: { include: { event: true } } }
    });

    if (!nextInLine) return;

    const offerToken = randomBytes(16).toString('hex');
    const offerExpiresAt = new Date();
    offerExpiresAt.setMinutes(offerExpiresAt.getMinutes() + parseInt(process.env['OFFER_TTL_MINUTES'] ?? '15'));

    await prisma.$transaction(async (tx) => {
      await tx.seatStatus.update({
        where: { showId_seatId: { showId, seatId } },
        data: { status: 'HELD', heldBy: nextInLine.customerId, holdExpiresAt: offerExpiresAt }
      });
      await tx.waitlist.update({
        where: { id: nextInLine.id },
        data: { status: 'OFFERED', offerToken, offerExpiresAt }
      });
    });

    io.to(`show_${showId}`).emit('seat:held', { showId, seatId, status: 'HELD' });

    const offerUrl = `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/offers/${offerToken}`;
    try {
      const mailer = await getTransporter();
      const info = await mailer.sendMail({
        from: `"Ticket Booking" <${fromAddress}>`,
        to: nextInLine.customer.email,
        subject: `Waitlist Offer: ${nextInLine.show.event.name}`,
        html: `
          <h1>You're off the waitlist!</h1>
          <p>A seat is available for <strong>${nextInLine.show.event.name}</strong>.</p>
          <p>Claim it within ${process.env['OFFER_TTL_MINUTES'] ?? 15} minutes: <a href="${offerUrl}">${offerUrl}</a></p>
          <p>This offer expires at ${offerExpiresAt.toLocaleTimeString()}.</p>
        `
      });
      if (isEthereal) {
        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('📧 Waitlist offer email preview:', preview);
      } else {
        console.log(`Waitlist offer sent to ${nextInLine.customer.email}`);
      }
    } catch (emailErr) {
      console.error('Waitlist email failed:', emailErr);
    }
  } catch (error) {
    console.error('Error assigning waitlist:', error);
  }
};

export const startWaitlistSweep = () => {
  setInterval(async () => {
    try {
      const expiredOffers = await prisma.waitlist.findMany({
        where: { status: 'OFFERED', offerExpiresAt: { lt: new Date() } }
      });

      for (const offer of expiredOffers) {
        const heldSeat = await prisma.seatStatus.findFirst({
          where: { showId: offer.showId, heldBy: offer.customerId, status: 'HELD' },
          include: { seat: true }
        });

        await prisma.$transaction(async (tx) => {
          await tx.waitlist.update({ where: { id: offer.id }, data: { status: 'EXPIRED' } });
          if (heldSeat) {
            await tx.seatStatus.update({
              where: { id: heldSeat.id },
              data: { status: 'AVAILABLE', heldBy: null, holdExpiresAt: null }
            });
          }
        });

        if (heldSeat) {
          io.to(`show_${offer.showId}`).emit('seat:released', { showId: offer.showId, seatId: heldSeat.seatId, status: 'AVAILABLE' });
          await assignWaitlist(offer.showId, heldSeat.seat.categoryId, heldSeat.seatId);
        }
      }
    } catch (error) {
      console.error('Error in waitlist sweep:', error);
    }
  }, 30000);
};
