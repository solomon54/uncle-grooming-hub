# Customer Experience Specification (CXS v1.1)

**Project:** Uncle Grooming Hub  
**Authority:** PRD v1.0, ECS v1.3, AMS v1.3  
**Version:** 1.1 — Closes gaps identified in design review session  
**Changes from v1.0:** Queue token system, cashier tip wallet, dual notification channel (Telegram + SMS), reservation scam mitigation, ticket display on customer device.

---

## 0. Design Principle

The customer feels **informed, respected, and never surprised.**  
They never need to ask "where am I?" or "how long?" They choose their barber, their services, whether to tip — and who to tip. The system serves that choice completely.

---

## 1. Customer Identity — How a Customer Enters the System

### 1.1 Walk-In (Primary Flow)

A customer walks in. No app. No account. No friction.

**The cashier collects:**
- **First name** (required — used to address them internally)
- **Preferred barber** (required — from roster; "Any Available" is valid)
- **Phone number or Telegram handle** (optional — for queue alerts and tracking)

**The system immediately produces:**
- A `Shadow Profile` with a UUID v7 as primary key
- A **Queue Token** — a short human-readable alphanumeric code (e.g., "A-07") assigned at check-in
- A `QueueEntry` initialized to `WAITING` via `EVENT 01 — CUSTOMER_CHECKED_IN`

**The queue token appears:**
- On the public status board next to the customer's display slot
- On the customer's phone if they access the tracking URL
- On the cashier's internal screen

This means the customer sees "A-07" on the board and on their own device. They self-identify without any name being displayed publicly.

**Token format:** One letter (rotating A–Z, resets daily) + two-digit sequence number. Resets each morning. Collision-free within a single shop day.

**What is NOT collected at walk-in:**
- Email address
- Password
- Payment method

### 1.2 Returning Customer

Cashier searches by phone number or Telegram handle. If found, the system pre-fills:
- Preferred barber from last visit (editable)
- First name (editable)
- Service history visible to cashier internally

Check-in still emits `EVENT 01` — same flow, richer pre-fill.

### 1.3 Reservation Arrival (Phase 2)

Customer reserved remotely. They arrive and give their name or show their reservation token. Cashier finds the `RESERVED` QueueEntry, confirms arrival → `EVENT 01` with `reservation_id` → `RESERVED → WAITING`. Queue token is assigned at this moment if not already assigned.

### 1.4 Account Promotion (Optional)

At any point, a customer may create a Verified Account to retain history, points, and tracking access. Never required.

1. Cashier initiates Account Promotion flow (or customer does on their own device in Phase 2)
2. Customer provides phone number
3. OTP sent via SMS or Telegram
4. Customer confirms OTP
5. `EVENT 10 — ACCOUNT_VERIFIED` committed
6. Shadow Profile → Verified Account. All history and points merge.

Idempotent: if phone already has a Verified Account, surfaces that account instead of creating a duplicate.

---

## 2. Reservation — Spot-Holding Before Arrival

### 2.1 How It Works

A customer with a Verified Account (Phase 2) may reserve a spot via the mobile app or web interface before arriving. The system:

1. Shows available slots based on the `AvailabilityCalendar` projection (barber schedule + existing queue load)
2. Customer selects a slot and preferred barber
3. Cloud emits `EVENT 19 — APPOINTMENT_RESERVED` → `QueueEntry → RESERVED`
4. Customer receives a reservation token and confirmation via Telegram/SMS

**No payment is taken at reservation.** The spot is held by presence, not money.

### 2.2 Scam / No-Show Risk — Mitigation

**Is this risky?** Yes, but manageable. The threat: a person makes fake reservations repeatedly to block barbers without intending to arrive. Analysis:

- There is no financial incentive (no money captured, no deposit)
- The grace window (`EVENT 25`, default 15 minutes) auto-expires the slot if no `EVENT 01` (physical check-in) is linked
- The barber's lane simply resumes with the next customer after expiry
- The operational disruption is 15 minutes of potential idle time per abuse instance

**Mitigation measures:**
- Reservation requires a Verified Account (phone-verified identity) — anonymous reservations are not allowed
- A no-show counter is tracked on the `CustomerProfile` aggregate. After 3 no-shows within 30 days, the system flags the account and requires Admin approval for future reservations
- Admin can manually block a customer's reservation capability via an adjustment event
- The grace window is configurable by Admin (EVENT 24 extension) — can be tightened to 10 minutes

**Decision: Keep reservations.** The 15-minute grace window plus phone-verified identity is sufficient protection. The marginal disruption risk is lower than the value of the feature to genuine customers.

### 2.3 No-Show Tracking Event

**EVENT payload addition to `EVENT 25 — RESERVATION_EXPIRED`:**

Add to domain payload:
```
no_show_count_at_time: number   // snapshot of customer's cumulative no-shows
reservation_flagged: boolean    // true if this triggers the 3-strike threshold
```

No new event needed — this data is computed by the projection from `EVENT 25` history per `customer_uuid`.

---

## 3. Customer Device Tracking — The Digital Ticket

### 3.1 What the Customer Sees on Their Own Device

When a customer provides a phone number or Telegram handle at check-in, the cashier system generates a short tracking URL:

```
https://track.unclegroominghub.com/q/{queue_token}
```

Example: `https://track.unclegroominghub.com/q/A-07`

The customer opens this on their own device and sees:

```
┌─────────────────────────────────┐
│  Uncle Grooming Hub             │
│                                 │
│  Your Ticket: A-07              │  ← large, clear, their token
│                                 │
│  📍 Dawit's Lane                │  ← their preferred barber
│  Position: 2nd in line          │
│  Est. wait: ~25–35 min          │  ← range, never precise
│                                 │
│  Currently serving: A-05        │  ← who's in the chair (token only)
│  Just finished: A-04            │
│                                 │
│  Your services:                 │
│  • Haircut                      │
│  • Beard Trim                   │
│                                 │
│  [ Cancel my spot ]             │  ← available until service starts
└─────────────────────────────────┘
```

This page:
- Requires NO login
- Shows ONLY their own position and lane state
- Refreshes automatically (polling every 30 seconds or WebSocket if available)
- Is accessible from the tracking URL for the duration of their visit

### 3.2 What the Status Board Shows

The public in-shop display shows:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  DAWIT       │  │  ABEL        │  │  YONAS       │
│              │  │              │  │              │
│  In chair:   │  │  In chair:   │  │  On break    │
│  A-05 ●      │  │  B-03 ●      │  │  Back ~14min │
│              │  │              │  │              │
│  Waiting:    │  │  Waiting:    │              │
│  A-07 next   │  │  B-06        │              │
│  A-09        │  │  B-08        │              │
│  A-11        │  │              │              │
│              │  │              │              │
│  ~45 min     │  │  ~20 min     │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

Tokens only. No names. No services. No prices.

The customer looks at the board, sees their token in the list, and knows exactly where they are. The board and their phone show the same token — they are always correlated.

### 3.3 Queue Token in ECS

`EVENT 01 — CUSTOMER_CHECKED_IN` payload addition:
```
queue_token: string   // e.g., "A-07" — assigned by cashier terminal at check-in
```

`QueueBoardView` view model addition:
```typescript
queue_token: string  // displayed on board and customer tracking page
```

Token generation rule: cashier terminal generates token locally as `{daily_letter}{daily_sequence_padded_2}`. Daily letter and sequence reset to A-01 each morning. Persisted in `SystemProcess` aggregate's daily state.

---

## 4. Service Selection

### 4.1 At Check-In

Cashier presents service menu. Customer chooses verbally. Cashier adds intents via `EVENT 21`. No upselling. Clear list with names (EN + AM) and prices.

### 4.2 Changes Before Service Starts

Customer may add or remove services anytime before `EVENT 04 — SERVICE_ENGAGED`:
- `EVENT 21 — SERVICE_INTENT_ADDED`
- `EVENT 22 — SERVICE_INTENT_REMOVED`

Once `EVENT 04` is committed: intent list is locked into the Transaction snapshot. No changes possible via these events. Any post-engagement correction requires Admin via `EVENT 09`.

### 4.3 Via Tracking Page (Phase 2)

Verified Account holders may update their own service intents from the tracking page before service starts. These emit `EVENT 21`/`22` via Cloud Authority. Same lock rule applies.

---

## 5. Payment Flow — The QR Handshake

### 5.1 How the QR Works

When the barber completes service (`EVENT 05`), the cashier initiates billing (`EVENT 06`). This creates a `payment_intent_id` — a UUID.

The QR encodes only:
```
https://pay.unclegroominghub.com/i/{payment_intent_id}
```

No price. No name. No service list. The QR is a pointer, not a data carrier.

When scanned, the Cloud API resolves `payment_intent_id` → `transaction_uuid` → full transaction details. The customer's phone displays the payment dashboard automatically.

### 5.2 The Payment Dashboard (Customer's Phone)

```
┌─────────────────────────────────────┐
│  Uncle Grooming Hub                 │
│  Your Ticket: A-07                  │
│                                     │
│  Service Summary                    │
│  ─────────────────────────────      │
│  Haircut                  350 ETB   │
│  Beard Trim               150 ETB   │
│  ─────────────────────────────      │
│  Subtotal                 500 ETB   │
│                                     │
│  ✂ Tip for Dawit (your barber)?     │
│  ○ 25   ○ 50   ○ 100   ○ 150 ETB  │
│  ○ Custom: [____] ETB               │
│                                     │
│  ☕ Tip for the front desk?          │
│  ○ 20   ○ 50 ETB                   │
│  ○ Custom: [____] ETB               │
│                                     │
│  ─────────────────────────────      │
│  Total                    500 ETB   │  ← updates live as tips added
│                                     │
│  [ Pay with Telebirr    ]           │
│  [ Pay with Chapa       ]           │
│  [ Pay cash at the desk ]           │
└─────────────────────────────────────┘
```

Both tip fields are optional and default to 0. Either or both may be filled. The total updates live.

### 5.3 Tip Privacy — Who Sees What

| Party | Sees barber tip | Sees desk tip | Sees total |
|---|---|---|---|
| Customer | ✅ Their own choice | ✅ Their own choice | ✅ Yes |
| Cashier terminal | ❌ Never | ❌ Never | ✅ Total received only |
| Barber dashboard | Aggregate only (5+ batch) | ❌ Never | ❌ Never |
| Admin audit | ✅ Full breakdown | ✅ Full breakdown | ✅ Yes |

The cashier confirms "600 ETB received" — never knows the tip breakdown. The system ledger records it internally.

### 5.4 Tip Wallets — Updated Model

Three virtual wallets exist per transaction:

1. **Shared Business Wallet** — receives the base service price
2. **Barber Partnership Wallet** — receives the barber tip (one per barber)
3. **Cashier Service Wallet** — receives the desk/cashier tip (one per cashier on duty)

The `Cashier Service Wallet` is new. It follows the same rules as the Barber Partnership Wallet: virtual accounting only, never held as real funds, visible to Admin in audit, visible to the individual cashier in aggregate delayed batches, never visible to barbers or other cashiers.

Ledger entry on settlement:
```
Debit:  Digital/Cash Receivable        600 ETB
Credit: Shared Business Wallet         500 ETB  (base price)
Credit: Barber Partnership Wallet      70 ETB   (barber tip)
Credit: Cashier Service Wallet         30 ETB   (desk tip)
```

Sum must always equal zero. `total_paid = base + barber_tip + cashier_tip`.

### 5.5 Tip Pre-Built Amounts

Configurable by Admin. Stored in `SystemProcess` aggregate.

Default barber tip options: 25 / 50 / 100 / 150 ETB  
Default desk tip options: 20 / 50 ETB

Changes apply prospectively (active transactions use amounts in effect at `EVENT 06`).

### 5.6 Cash Payment

Customer selects "Pay cash at the desk." They hand cash to the cashier. Cashier confirms. Settlement flows through Cloud `EVENT 08` exactly as digital — same ledger split.

### 5.7 Digital Payment

Customer pays on their phone via Telebirr/Chapa. Gateway webhook → Cloud emits `EVENT 08`. Cloud syncs to terminal. Cashier screen updates automatically. No cashier action required for digital.

---

## 6. Customer Notifications — Telegram Primary, SMS Fallback

### 6.1 Channel Strategy

| Channel | Cost | Requirements | When to use |
|---|---|---|---|
| Telegram Bot | Free | Customer has Telegram (common in Ethiopia) | Primary — prefer this |
| SMS | Requires provider | Any phone number | Fallback if no Telegram |

At check-in, the cashier asks: "Telegram or SMS for updates?" Customer provides either a Telegram handle (e.g., @dawit) or a phone number. Both are stored on the Shadow Profile.

If customer provides both: Telegram is used. SMS is a fallback only if Telegram delivery fails.

If customer provides neither: no notifications sent. Status board and tracking URL are their only signals.

### 6.2 Telegram Bot Setup

A single Telegram Bot represents the shop (e.g., @UncleGroomingBot). No external API payment required for basic bot messaging. Setup requires:
- Creating a bot via @BotFather (free, one-time)
- Storing the bot token in the Cloud backend environment
- The customer must have started a conversation with the bot at least once (Telegram limitation) OR the cashier sends a one-time opt-in link to the customer's Telegram

**Opt-in link approach (recommended):** At check-in, if customer gives Telegram handle, the system generates a one-time link: `https://t.me/UncleGroomingBot?start=optin_{queue_token}`. Cashier shows this as a QR on the intake screen. Customer scans, opens Telegram, taps Start → bot can now message them. This solves the Telegram opt-in requirement elegantly.

### 6.3 Two Notification Events

**Alert 1 — "You're getting close"**  
Trigger: `EVENT 04` committed for the entry directly ahead of this customer in their preferred barber's lane.  
Message (EN): "Hi [Name] 👋 You're next at Uncle Grooming Hub! About [X]–[Y] min until your turn. Make your way in — Ticket A-07."  
Message (AM): [Amharic equivalent]

**Alert 2 — "You've been called"**  
Trigger: `EVENT 03 — CUSTOMER_CALLED_TO_CHAIR` committed for this customer's entry.  
Message (EN): "It's your turn! [Barber Name] is ready for you. Come to the chair — Ticket A-07. 🪒"

### 6.4 EVENT 26 — CUSTOMER_NOTIFICATION_SENT

- **Emitter:** Cloud Authority (notification service, triggered post-sync)
- **Aggregate:** QueueEntry
- **Preconditions:** QueueEntry is `WAITING` or `CALLED`. Customer has a notification handle on their profile.
- **Payload:**
  ```
  notification_type:   'QUEUE_ALERT' | 'CALLED_TO_CHAIR'
  channel:             'TELEGRAM' | 'SMS'
  delivered:           boolean
  trigger_event_type:  'SERVICE_ENGAGED' | 'CUSTOMER_CALLED_TO_CHAIR'
  recipient_hash:      string  // SHA-256 of handle — never plain text in event
  ```
- **State Effect:** None on QueueEntry state machine. Audit record only.
- **Idempotency:** One `QUEUE_ALERT` and one `CALLED_TO_CHAIR` per QueueEntry. Enforced by `notification_type` + `aggregate_id` uniqueness.

---

## 7. Cancellation

Customer may cancel at any point before `EVENT 04 — SERVICE_ENGAGED`.

**How:**
- Walk-in: tells cashier → `EVENT 20` with `reason_code: 'CUSTOMER_REQUEST'`
- Via tracking page: taps "Cancel my spot" → `EVENT 20` via Cloud Authority (Phase 2)
- No-show: cashier marks → `EVENT 20` with `reason_code: 'NO_SHOW'`
- Deterministic expiry (reservations): `EVENT 25` fires automatically after grace window

After `EVENT 04`: no cancellation path. Admin-only correction via `EVENT 09`.

---

## 8. Privacy Rules Summary

| Data | Public Board | Cashier Internal | Customer's Device | Barber Dashboard | Admin |
|---|---|---|---|---|---|
| Queue token (e.g. A-07) | ✅ | ✅ | ✅ | ✅ (their lane only) | ✅ |
| First name | ❌ | ✅ | ✅ | ✅ (current client) | ✅ |
| Phone / Telegram | ❌ | Masked | ✅ | ❌ | ✅ |
| Service list | ❌ | ✅ | ✅ | ✅ (current client) | ✅ |
| Barber tip | ❌ | ❌ | ✅ (their own) | Aggregate 5+ batch | ✅ |
| Desk tip | ❌ | ❌ | ✅ (their own) | ❌ | ✅ |
| Total price | ❌ | Total only | ✅ | ❌ | ✅ |
| Loyalty tier | ❌ | ✅ | ✅ | ❌ | ✅ |

---

*CXS v1.1 — Uncle Grooming Hub*  
*Supersedes CXS v1.0*
