import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import showRoutes from './routes/showRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins (localhost, 127.0.0.1, LAN IPs) for dev and production
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organiser/events', eventRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', waitlistRoutes);

io.on('connection', (socket) => {
  socket.on('join_show', (showId: string) => {
    if (showId) {
      socket.join(`show_${showId}`);
      console.log(`[Socket] Client ${socket.id} joined room show_${showId}`);
    }
  });
  socket.on('leave_show', (showId: string) => {
    if (showId) {
      socket.leave(`show_${showId}`);
      console.log(`[Socket] Client ${socket.id} left room show_${showId}`);
    }
  });
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client ${socket.id} disconnected:`, reason);
  });
});

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', time: new Date() }));

import { startSeatHoldSweep } from './jobs/seatHoldSweep.js';
import { startWaitlistSweep } from './jobs/waitlistAssigner.js';

const PORT = process.env['PORT'] ?? 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSeatHoldSweep();
  startWaitlistSweep();
});
