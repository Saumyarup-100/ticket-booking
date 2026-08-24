# System Design: Ticket Booking Platform

## Overview

This platform handles real-time seat selection, holds, and bookings for movies and concerts. The two hardest problems are (1) preventing double-booking under concurrent load and (2) fairly managing a waitlist when seats free up. Both are solved at the database layer, not the application layer.

---

## 1. Seat Hold & TTL Mechanism

When a customer clicks a seat, the system places a **hold** — a temporary reservation that gives them time to complete checkout without the seat being taken by someone else. The hold has a configurable TTL (default: 10 minutes, set via `HOLD_TTL_MINUTES`).

The `SeatStatus` table has one row per seat per show, with fields: `status` (`AVAILABLE` / `HELD` / `BOOKED`), `heldBy` (user ID), and `holdExpiresAt`. This is the single source of truth for seat state.

A background sweep job runs every 15 seconds:

```sql
UPDATE "SeatStatus"
SET status = 'AVAILABLE', "heldBy" = NULL, "holdExpiresAt" = NULL
WHERE status = 'HELD' AND "holdExpiresAt" < NOW();
```

On every release, a `seat:released` WebSocket event is broadcast to all clients viewing that show, so the seat map updates live without polling.

The frontend shows a countdown timer during checkout. If the timer hits zero, the cart refreshes and the expired hold disappears, prompting the user to re-select.

---

## 2. Concurrency Protection — No Double-Booking

This is the most critical correctness requirement. A naive read-then-write approach (read status, check if available, then update) has a race condition: two requests can both read `AVAILABLE` before either writes `HELD`.

The solution is **PostgreSQL row-level locking inside a transaction**:

```sql
BEGIN;
SELECT status FROM "SeatStatus"
  WHERE "showId" = $1 AND "seatId" = $2
  FOR UPDATE;
```

`FOR UPDATE` acquires an exclusive lock on that row. Any concurrent transaction attempting the same lock will block until the first commits or rolls back. This serializes all hold attempts for the same seat at the database level — no application-level mutex or Redis lock needed.

The flow inside the transaction:
1. Lock the row with `FOR UPDATE`
2. Check `status === 'AVAILABLE'` — if not, rollback and return `409 Conflict`
3. Update to `HELD` with `heldBy` and `holdExpiresAt`
4. Commit

The same pattern applies when converting a hold to a confirmed booking (re-lock, verify still `HELD` by this user, update to `BOOKED`).

A `UNIQUE(showId, seatId)` constraint on `SeatStatus` provides a second safety net at the schema level — even if two transactions somehow both passed the status check, only one `INSERT` or `UPDATE` can win.

Under a concurrency test firing 10 simultaneous hold requests for the same seat, exactly 1 succeeds and 9 receive `409 Conflict`. This is verified by `tests/concurrency.test.ts`.

---

## 3. Waitlist & Auto-Assignment

When all seats in a category are booked, customers can join the waitlist. The `Waitlist` table stores: `showId`, `categoryId`, `customerId`, `position` (auto-increment), `status` (`WAITING` / `OFFERED` / `EXPIRED` / `BOOKED`), and `offerToken`.

**On booking cancellation:**
1. The cancelled seats are set back to `AVAILABLE` inside a transaction.
2. For each freed seat, `assignWaitlist(showId, categoryId, seatId)` is called.
3. It finds the oldest `WAITING` entry for that show + category (FIFO by `joinedAt`).
4. Inside a transaction: the seat is set to `HELD` for that customer, and the waitlist entry is set to `OFFERED` with a unique `offerToken` and `offerExpiresAt` (default: 15 minutes).
5. An email is sent with a tokenized link: `/offers/:token`.

**Offer acceptance:**
The customer visits the offer link, sees the show details and expiry time, and clicks "Accept". The `POST /api/offers/:token/confirm` endpoint:
1. Validates the token, status, expiry, and that the requesting user matches.
2. Locks the held seat with `FOR UPDATE`.
3. Creates the booking, updates seat to `BOOKED`, marks waitlist entry as `BOOKED`.
4. Sends a confirmation email with an inline QR code.

**Offer expiry cascade:**
A sweep job runs every 30 seconds. For each `OFFERED` entry past its `offerExpiresAt`:
1. Mark entry `EXPIRED`, release the seat back to `AVAILABLE`.
2. Immediately call `assignWaitlist` again for the same seat — cascading to the next person in line. This repeats until the waitlist is exhausted or the seat is booked.

---

## 4. Real-Time Seat Map (WebSockets)

Socket.IO rooms are used per show: `show_<showId>`. Clients join on page load and leave on unmount. The server emits three events:

- `seat:held` — when any user holds a seat
- `seat:released` — when a hold expires or is manually released
- `seat:booked` — when a booking is confirmed

This gives all viewers of a show instant visual feedback (green → yellow → red) without polling. The frontend updates local state directly from socket events, so the UI is always consistent with the DB.

---

## 5. QR Code & Email Delivery

On confirmed booking, the `bookingReference` (an 8-character alphanumeric code) is encoded into a QR PNG using the `qrcode` library. The base64 image is attached as an inline CID attachment in an HTML email sent via Nodemailer. No image files are persisted — the QR is regenerated from the reference on demand if needed.

SMTP is fully configurable via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`), supporting Mailtrap for development and any production SMTP provider.
