# API Documentation

Base URL: `http://localhost:5000`

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Auth

### POST /api/auth/register
Register a new user.

**Body:** `{ name, email, password, role? }` — role: `CUSTOMER` | `ORGANISER` | `ADMIN` (default: `CUSTOMER`)

**Response 201:** `{ message, userId }`

---

### POST /api/auth/login
Login and receive a JWT.

**Body:** `{ email, password }`

**Response 200:** `{ token, user: { id, name, email, role } }`

---

## Venues (Admin only)

### POST /api/venues
Create a venue.

**Body:** `{ name, address }`  **Response 201:** venue object

---

### GET /api/venues
List all venues. **Response 200:** array of venues

---

### GET /api/venues/:id
Get venue with layouts, categories, and seats. **Response 200:** venue object

---

### POST /api/venues/:id/categories
Add a seat category to a venue.

**Body:** `{ name, basePrice }` **Response 201:** category object

---

### POST /api/venues/:id/layout
Save a layout JSON for a venue.

**Body:** `{ layoutJson }` **Response 201:** layout object

---

### POST /api/venues/:id/seats
Generate seats for a venue from a grid definition. Deletes and recreates all seats.

**Body:**
```json
{
  "rows": 10,
  "cols": 10,
  "categoryMap": { "0": "<categoryId>", "1": "<categoryId>" }
}
```
`categoryMap` maps row index (0-based string) to a category ID. Unmapped rows use the first category.

**Response 201:** `{ message, count }`

---

## Events & Shows

### POST /api/events
Create an event. **Auth:** Organiser or Admin

**Body:** `{ name, description? }` **Response 201:** event object

---

### GET /api/events
List all events with shows. Supports query params: `?search=<name>&venueId=<id>`

**Response 200:** array of events with nested shows

---

### GET /api/events/:id
Get a single event with shows. **Response 200:** event object

---

### POST /api/events/:id/shows
Create a show for an event. Also auto-creates `SeatStatus` rows for all venue seats. **Auth:** Organiser or Admin

**Body:** `{ venueId, date, time }` — date: ISO string, time: "HH:MM"

**Response 201:** show object

---

### GET /api/events/:id/summary
Get booking stats for an event. **Auth:** Organiser or Admin

**Response 200:** `{ revenue, seatsSold, totalBookings }`

---

## Seats & Shows

### GET /api/shows/:id/seats
Get all seat statuses for a show with live status, seat info, and category.

**Response 200:** array of SeatStatus objects with nested seat, category, and show

---

### POST /api/shows/:id/seats/:seatId/hold
Hold a seat. Uses `SELECT ... FOR UPDATE` transaction. **Auth:** required

**Response 200:** `{ message, hold }` — **409** if seat not available

---

### DELETE /api/shows/:id/seats/:seatId/hold
Manually release a hold (only if held by the requesting user). **Auth:** required

**Response 200:** `{ message }`

---

## Bookings

### POST /api/bookings
Confirm all held seats for a show into a booking. Sends QR email. **Auth:** required

**Body:** `{ showId }`

**Response 201:** `{ message, booking }`

---

### GET /api/bookings/me
Get the authenticated user's booking history. **Auth:** required

**Response 200:** array of bookings with show, event, venue, and seats

---

### GET /api/bookings/holds
Get the authenticated user's current held seats (cart). **Auth:** required

**Response 200:** array of SeatStatus with show, event, venue, seat, and category

---

### POST /api/bookings/:id/cancel
Cancel a confirmed booking. Releases seats and triggers waitlist assignment. **Auth:** required

**Response 200:** `{ message }`

---

## Waitlist

### POST /api/shows/:id/waitlist
Join the waitlist for a sold-out category. **Auth:** required

**Body:** `{ categoryId }`

**Response 201:** `{ message, waitlist }` — **409** if already on waitlist

---

### GET /api/offers/:token
View a waitlist offer by token. Public.

**Response 200:** waitlist entry with show, event, venue, and category — **404** if invalid/expired

---

### POST /api/offers/:token/confirm
Accept a waitlist offer and create a booking. Sends QR email. **Auth:** required (must be the offer recipient)

**Response 201:** `{ message, booking }`

---

## WebSocket Events

Connect to the Socket.IO server at the base URL.

| Event (emit) | Payload | Description |
|---|---|---|
| `join_show` | `showId` | Subscribe to a show's seat updates |
| `leave_show` | `showId` | Unsubscribe |

| Event (listen) | Payload | Description |
|---|---|---|
| `seat:held` | `{ showId, seatId, status }` | A seat was held |
| `seat:released` | `{ showId, seatId, status }` | A hold expired or was released |
| `seat:booked` | `{ showId, seatId, status }` | A seat was confirmed booked |
