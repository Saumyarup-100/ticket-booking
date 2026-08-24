# Database Schema

## Tables

### User
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | String | |
| email | String UNIQUE | |
| password | String | bcrypt hash |
| role | Enum | CUSTOMER \| ORGANISER \| ADMIN |
| createdAt | DateTime | |

---

### Venue
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | String | |
| address | String | |

---

### VenueLayout
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| venueId | FK → Venue | |
| layoutJson | JSON | `{ rows, cols, categoryMap }` |

---

### SeatCategory
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| venueId | FK → Venue | |
| name | String | e.g. "Premium", "Standard" |
| basePrice | Float | |

---

### Seat
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| venueId | FK → Venue | |
| categoryId | FK → SeatCategory | |
| seatLabel | String | e.g. "A1", "B5" |
| row | Int | 0-based |
| col | Int | 0-based |

---

### Event
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | String | |
| description | String? | |
| organiserId | FK → User | must be ORGANISER or ADMIN |

---

### Show
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| eventId | FK → Event | |
| venueId | FK → Venue | |
| date | DateTime | |
| time | String | "HH:MM" |

---

### SeatStatus ⭐ (core concurrency table)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| showId | FK → Show | |
| seatId | FK → Seat | |
| status | Enum | AVAILABLE \| HELD \| BOOKED |
| heldBy | String? | User ID |
| holdExpiresAt | DateTime? | NULL when AVAILABLE or BOOKED |

**Unique constraint:** `(showId, seatId)` — one status row per seat per show.

All state transitions use `SELECT ... FOR UPDATE` inside a transaction.

---

### Booking
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| showId | FK → Show | |
| userId | FK → User | |
| totalAmount | Float | |
| status | Enum | CONFIRMED \| CANCELLED |
| bookingReference | String UNIQUE | 8-char alphanumeric |
| createdAt | DateTime | |

---

### BookingSeat
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| bookingId | FK → Booking | |
| seatId | FK → Seat | |

---

### Waitlist
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| showId | FK → Show | |
| categoryId | FK → SeatCategory | |
| customerId | FK → User | |
| position | Int | auto-increment |
| status | Enum | WAITING \| OFFERED \| EXPIRED \| BOOKED |
| joinedAt | DateTime | used for FIFO ordering |
| offerExpiresAt | DateTime? | set when status = OFFERED |
| offerToken | String? UNIQUE | tokenized link for offer email |

---

## Key Relationships

```
User ──< Booking ──< BookingSeat >── Seat >── SeatCategory
                                              │
Show ──< SeatStatus >── Seat          Venue ──┤
  │                                           ├── VenueLayout
  └──< Waitlist                               └── Seat
```
