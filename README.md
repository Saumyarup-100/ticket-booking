# Ticket Booking System

A real-time movie/concert ticket booking platform with liquid glass aesthetics, interactive drag-to-paint seat maps, transactional seat holds, automated category waitlists, and QR-ticket email delivery.

## 🌐 Live Hosted Application (Deliverable 3)

| Component | Platform | Live URL |
|---|---|---|
| **Frontend Web App** | **Vercel** | [https://ticket-booking-rosy.vercel.app](https://ticket-booking-rosy.vercel.app) |
| **Backend API Server** | **Render** | [https://ticket-booking-lbz5.onrender.com](https://ticket-booking-lbz5.onrender.com) |
| **Database** | **Aiven PostgreSQL** | Cloud Managed with SSL/TLS |
| **Source Code Archive** | **Deliverable 1** | [`ticket-booking-system.zip`](ticket-booking-system.zip) |
| **System Design Spec** | **Deliverable 4** | [`docs/system-design.md`](docs/system-design.md) |

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + TypeScript + Tailwind |
| Backend | Node.js + Express (TypeScript) |
| Database | PostgreSQL (Prisma ORM) |
| Realtime | Socket.IO |
| Auth | JWT + bcrypt |
| QR Codes | `qrcode` npm package |
| Email | Nodemailer (configurable SMTP) |

## Features

- JWT role-based auth: Customer, Organiser, Admin
- Venue & seat layout management (Admin)
- Event & show scheduling (Organiser)
- Live seat map with real-time WebSocket updates
- Seat hold with configurable TTL and countdown timer
- Row-level DB locking (`SELECT ... FOR UPDATE`) — no double-booking possible
- Booking confirmation with QR code emailed inline
- Booking cancellation
- Waitlist with FIFO auto-assignment and time-limited tokenized offers
- Organiser dashboard with revenue & booking stats

## Setup

### Prerequisites
- Node.js 18+
- Docker (for local Postgres) or an existing PostgreSQL instance

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npx prisma db push          # apply schema
npx prisma generate         # generate client
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

## Environment Variables

### backend/.env.example
```
PORT=5000
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/ticket_booking?schema=public"
JWT_SECRET="<your-jwt-secret>"
HOLD_TTL_MINUTES=10
OFFER_TTL_MINUTES=15
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="<smtp-username>"
SMTP_PASS="<smtp-password>"
FRONTEND_URL="http://localhost:5173"
```

### frontend/.env.example
```
VITE_API_URL="http://localhost:5000"
```

> For email delivery in development, use [Mailtrap](https://mailtrap.io) (free) or [Ethereal](https://ethereal.email). For production, use [Resend](https://resend.com) or Gmail app password.

## Database Schema

```
User          id, name, email, password, role (CUSTOMER|ORGANISER|ADMIN)
Venue         id, name, address
VenueLayout   id, venueId, layoutJson (rows/cols/categoryMap)
SeatCategory  id, venueId, name, basePrice
Seat          id, venueId, categoryId, seatLabel, row, col
Event         id, name, description, organiserId
Show          id, eventId, venueId, date, time
SeatStatus    id, showId, seatId, status (AVAILABLE|HELD|BOOKED), heldBy, holdExpiresAt
              UNIQUE(showId, seatId)
Booking       id, showId, userId, totalAmount, status (CONFIRMED|CANCELLED), bookingReference
BookingSeat   id, bookingId, seatId
Waitlist      id, showId, categoryId, customerId, position, status (WAITING|OFFERED|EXPIRED|BOOKED),
              joinedAt, offerExpiresAt, offerToken
```

## Concurrency & Seat Hold Design

Every seat state change uses a PostgreSQL transaction with `SELECT ... FOR UPDATE` row-level locking:

```sql
BEGIN;
SELECT status FROM "SeatStatus"
  WHERE "showId" = $1 AND "seatId" = $2
  FOR UPDATE;
-- if status != 'AVAILABLE' → ROLLBACK → 409 Conflict
UPDATE "SeatStatus" SET status='HELD', "heldBy"=$3, "holdExpiresAt"=NOW() + interval '10 min'
  WHERE "showId"=$1 AND "seatId"=$2;
COMMIT;
```

The `UNIQUE(showId, seatId)` constraint is a second safety net. A background sweep job runs every 15 seconds to release expired holds and emit `seat:released` WebSocket events.

## Waitlist Flow

1. When a seat category is sold out, customers can join the waitlist.
2. On booking cancellation, the seat is freed and the oldest `WAITING` entry for that category is found.
3. That entry is moved to `OFFERED`, the seat is held for them (TTL = `OFFER_TTL_MINUTES`), and a tokenized email link is sent.
4. If they confirm via `/offers/:token` within the TTL, a booking is created directly.
5. If the TTL expires, the sweep job marks the entry `EXPIRED`, releases the seat, and cascades to the next person in line.

## Running the Concurrency Test

With the backend running and at least one available seat in the DB:
```bash
cd backend
npx tsx tests/concurrency.test.ts
```
Expected output: exactly 1 success (200) and 9 conflicts (409).

## API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| **POST** | `/api/auth/register` | Register customer, organiser, or admin | No |
| **POST** | `/api/auth/login` | Login and receive JWT token | No |
| **GET** | `/api/events` | Browse events & filter by search/venue | No |
| **GET** | `/api/events/:id` | Get event details and scheduled shows | No |
| **POST** | `/api/events` | Create new event (Organiser/Admin) | Yes (Organiser/Admin) |
| **POST** | `/api/events/:id/shows` | Schedule new show on a venue | Yes (Organiser/Admin) |
| **GET** | `/api/organiser/events/:id/summary` | Analytics: revenue, tickets, bookings | Yes (Organiser/Admin) |
| **GET** | `/api/venues` | List all venues | No |
| **GET** | `/api/venues/:id` | Get venue geometry and seat layouts | No |
| **POST** | `/api/venues` | Create venue | Yes (Admin) |
| **POST** | `/api/venues/:id/seats` | Save hall seat layout & tier geometry | Yes (Admin) |
| **GET** | `/api/shows/:id/seats` | Real-time seat map & hold statuses | No |
| **POST** | `/api/shows/:id/seats/:seatId/hold` | Transactional seat hold with TTL | Yes (Customer) |
| **DELETE** | `/api/shows/:id/seats/:seatId/hold` | Release held seat | Yes (Customer) |
| **POST** | `/api/bookings` | Confirm held seats & send QR ticket | Yes (Customer) |
| **GET** | `/api/bookings/me` | Customer booking history & tickets | Yes (Customer) |
| **POST** | `/api/bookings/:id/cancel` | Cancel booking & trigger waitlist | Yes (Customer) |
| **POST** | `/api/shows/:id/waitlist` | Join category-specific waitlist | Yes (Customer) |
| **GET** | `/api/offers/:token` | Validate priority waitlist offer | No |
| **POST** | `/api/offers/:token/confirm` | Claim waitlist seat & book ticket | Yes (Customer) |

For complete payload schemas and responses, see [`docs/api-docs.md`](docs/api-docs.md).

## System Design

For the full architectural write-up covering concurrency locks, TTL sweeps, waitlist FIFO assignment, and real-time WebSockets, see [`docs/system-design.md`](docs/system-design.md).

