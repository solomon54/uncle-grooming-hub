# MODULE_PRIORITY.md — Uncle Grooming Hub
## Ordered Build Plan & Dependency Graph

**This document defines what to build, in what order, and why.**  
**No module should be started before its dependencies are marked complete.**  
**Each phase produces a testable, runnable checkpoint.**

---

## The Dependency Graph (Read Before Anything Else)

```
PHASE 1: Foundation (Core Infrastructure)
    ├── P1.1 — RxDB Schemas          (no dependencies)
    ├── P1.2 — HLC Clock             (no dependencies)
    ├── P1.3 — Terminal Identity     (no dependencies)
    ├── P1.4 — Domain Event Types    (no dependencies)
    └── P1.5 — Journal Service       (needs P1.1, P1.2, P1.3, P1.4)
         ↓
PHASE 2: Projections (State Materialization)
    ├── P2.1 — Projection Engine     (needs P1.5)
    ├── P2.2 — QueueBoard Projection (needs P2.1)
    ├── P2.3 — BarberLane Projection (needs P2.1)
    ├── P2.4 — Transaction Projection(needs P2.1)
    └── P2.5 — Availability Projection (needs P2.1, P2.3)
         ↓
PHASE 3: Actions (Event Creators)
    ├── P3.1 — Session Actions       (needs P1.5)
    ├── P3.2 — Queue Actions         (needs P1.5, P2.2)
    ├── P3.3 — Barber Actions        (needs P1.5, P2.3)
    ├── P3.4 — Transaction Actions   (needs P1.5, P2.4)
    └── P3.5 — Schedule Actions      (needs P1.5)
         ↓
PHASE 4: Runtime & Sync
    ├── P4.1 — Runtime Bootstrap     (needs P1.5, P2.1)
    ├── P4.2 — RuntimeProvider       (needs P4.1)
    └── P4.3 — Sync Engine           (needs P1.5, P4.1)
         ↓
PHASE 5: UI Hooks (Projection Bridge)
    ├── P5.1 — useSession            (needs P4.2)
    ├── P5.2 — useQueueBoard         (needs P4.2, P2.2)
    ├── P5.3 — useBarberLane         (needs P4.2, P2.3)
    ├── P5.4 — useTransaction        (needs P4.2, P2.4)
    └── P5.5 — useSyncStatus         (needs P4.3)
         ↓
PHASE 6: Operational Screens (Internal Tools)
    ├── P6.1 — Operator Login        (needs P5.1, P3.1)
    ├── P6.2 — Cashier Screen        (needs P5.2, P3.2, P6.1)
    ├── P6.3 — Barber Dashboard      (needs P5.3, P3.3, P6.1)
    ├── P6.4 — Settlement Desk       (needs P5.4, P3.4, P6.1)
    └── P6.5 — Admin Panel           (needs all P5.x, P6.1)
         ↓
PHASE 7: Public-Facing Screens
    ├── P7.1 — Status Board          (needs P5.2, P5.3 — no session required)
    ├── P7.2 — Landing Page          (static — no runtime required)
    └── P7.3 — Reserve Screen        (needs Cloud API — deferred)
         ↓
PHASE 8: Sync & Cloud Integration
    ├── P8.1 — Supabase Schema       (needs P1.4)
    ├── P8.2 — Cloud Sync Endpoint   (needs P8.1)
    ├── P8.3 — Payment Webhook       (needs P8.1, P8.2)
    └── P8.4 — Reservation API       (needs P8.1, P8.3)
```

---

## Phase 1 — Foundation (Core Infrastructure)

**Goal:** A working journal that can accept, validate, and persist events. Nothing else.  
**Test:** `commitEvent()` with a valid `CUSTOMER_CHECKED_IN` payload writes to RxDB and is readable.

### P1.1 — RxDB Schema Definitions

**File:** `src/core/db/schemas/*.schema.ts` (one file per aggregate)  
**File:** `src/core/db/database.ts`

**What to build:**
- Move the content of `local-journal-cloud-ledger.ts` (root level) into `src/core/db/`
- Split each aggregate into its own schema file (e.g., `queue-entry.schema.ts`)
- `database.ts` initializes RxDB with `addRxPlugin(RxDBDevModePlugin)`, creates the database, registers all schemas
- Export a singleton `db` instance

**Schema required fields per ECS v1.3 (every aggregate):**
```typescript
event_id:          string  // UUID v7, primary key
aggregate_id:      string  // indexed
aggregate_version: number  // minimum: 1, indexed
event_type:        string  // enum of EventType
payload:           object
metadata: {
  hlc_timestamp:   string  // indexed
  terminal_id:     string
  actor_id:        string
  session_id:      string
  version:         number
  signature:       string
}
synced:            boolean // default: false — used by sync engine
```

**Do NOT include:** Any logic, queries, business rules, or functions. Schemas are pure data definitions.

**Verification:** TypeScript compiles. RxDB initializes without error in browser. `db.queue_entry` collection exists.

---

### P1.2 — HLC Clock Service

**Files:** `src/core/clock/hlc.ts`, `src/core/clock/clock.service.ts`

**What to build:**  
`hlc.ts` — Pure HLC implementation. No imports from project code.
```typescript
// Exports:
export function createHLC(): HLC
export function tickHLC(current: HLC, received?: HLC): HLC
export function compareHLC(a: HLC, b: HLC): -1 | 0 | 1
export function hlcToString(hlc: HLC): string    // format: "physicalMs:logicalCounter:terminalId"
export function hlcFromString(s: string): HLC
```

`clock.service.ts` — Singleton wrapper.
```typescript
// Exports:
export const clockService = {
  now(): string,              // Returns current HLC as string
  update(received: string),   // Advances clock on event receipt
}
```

**Invariant from TAS §4:** Reject any received HLC where physical_time > `local_wall_time + 60_000ms`. Log the rejection. Do not throw.

**Verification:** `clockService.now()` returns monotonically increasing strings across calls. `compareHLC(a, b)` returns correct ordering. Two calls within same millisecond produce different values due to logical counter.

---

### P1.3 — Terminal Identity

**File:** `src/core/terminal/terminal.identity.ts`

**What to build:**
```typescript
export const terminalIdentity = {
  getId(): string,  // Returns stable hardware-bound terminal_id
  init(): Promise<void>,  // Called once during bootstrap
}
```

**Implementation:** Use `localStorage.getItem('terminal_id')`. If null, generate UUID v4, persist it. This is the Phase 1 implementation — hardware binding (TPM/Secure Enclave) is Phase 2+.

**Verification:** Same `getId()` value across page reloads. Different value on different browsers/devices.

---

### P1.4 — Domain Event Types

**Files:** `src/domain/events/event.types.ts`, `src/domain/events/event.definitions.ts`

**What to build:**

`event.types.ts` — The union type of all 25 ECS event names:
```typescript
export type EventType =
  | 'CUSTOMER_CHECKED_IN'
  | 'BARBER_AVAILABLE'
  | 'CUSTOMER_CALLED_TO_CHAIR'
  | 'SERVICE_ENGAGED'
  | 'SERVICE_COMPLETED'
  | 'PAYMENT_INTENT_CREATED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_SETTLED'
  | 'ADJUSTMENT_EVENT'
  | 'ACCOUNT_VERIFIED'
  | 'QUEUE_TRANSFER_CONSENTED'
  | 'APPOINTMENT_RESERVED'
  | 'RESERVATION_CANCELLED'
  | 'SERVICE_INTENT_ADDED'
  | 'SERVICE_INTENT_REMOVED'
  | 'BARBER_SCHEDULE_UPDATED'
  | 'SHOP_HOURS_CHANGED'
  | 'OPERATOR_SESSION_OPENED'
  | 'OPERATOR_SESSION_CLOSED'
  | 'SYNC_BATCH_ACKNOWLEDGED'
  | 'RECONCILIATION_ANOMALY_DETECTED'
  | 'LOCAL_SNAPSHOT_COMMITTED'
  | 'TERMINAL_RECOVERY_COMPLETED'
  | 'RESERVATION_EXPIRED';
```

`event.definitions.ts` — Typed payload interfaces for every event. Each payload must match ECS v1.3 §3 exactly. Example:
```typescript
export interface CustomerCheckedInPayload {
  customer_uuid: string;
  preferred_barber_id: string | null;
  checkin_method: 'WALK_IN' | 'RESERVED';
  reservation_id?: string;
}
```
Define a payload interface for all 25 events.

**Verification:** TypeScript exhaustive switch on `EventType` compiles with no fallthrough warning when all 25 cases are handled.

---

### P1.5 — Journal Service

**File:** `src/core/journal/journal.service.ts`

**What to build:**  
The single write path for the entire application. This is the most critical file in the system.

```typescript
export const journalService = {
  async commitEvent<T extends EventType>(
    event_type: T,
    aggregate_id: string,
    payload: EventPayloadMap[T],
    session: ActiveSession
  ): Promise<CommitResult>
}
```

**Internal steps for every `commitEvent()` call (in order):**
1. Get current `aggregate_version` for `aggregate_id` from RxDB (0 if new aggregate)
2. **Reject** if `aggregate_version` check fails (`incoming != current + 1`) → return `{ success: false, reason: 'VERSION_CONFLICT' }`
3. **Reject** EVENT 21/22 if Transaction aggregate for this queue_entry already has EVENT 04 → return `{ success: false, reason: 'INTENT_LOCKED' }`
4. **Reject** EVENT 08, EVENT 19 from local code → return `{ success: false, reason: 'CLOUD_AUTHORITY_ONLY' }`
5. Build full event object with HLC from `clockService.now()`, `terminal_id` from `terminalIdentity.getId()`, `session_id` from `session.session_id`
6. Sign event (HMAC-SHA256 of event content — use a placeholder signing key for Phase 1)
7. Append to RxDB with `synced: false`
8. Return `{ success: true, event_id, hlc_timestamp }`

**What journal.service.ts MUST NOT do:**
- Trigger projection updates (the projection engine subscribes to RxDB changes)
- Emit any event in response to another event
- Have any UI imports

**Verification:** A test call to `commitEvent('CUSTOMER_CHECKED_IN', uuid, payload, session)` writes one document to RxDB. Calling it again with the wrong `aggregate_version` returns `VERSION_CONFLICT`. Calling it with event type `PAYMENT_SETTLED` returns `CLOUD_AUTHORITY_ONLY`.

---

## Phase 2 — Projections (State Materialization)

**Goal:** Given any sequence of events in the journal, produce correct typed view models.  
**Test:** Seed the journal with a known event sequence, run the projector, assert the output matches expected view.

### P2.1 — Projection Engine

**File:** `src/core/projection/projection.engine.ts`

**What to build:**
- Subscribes to RxDB `journal` collection changes (live query)
- On change: fetches all events for affected aggregate IDs, sorted by HLC
- Calls the appropriate projector (queue-board, barber-lane, etc.)
- Stores updated materialized view in memory (and optionally in IndexedDB for persistence)
- Exposes `getView<T>(viewName: string): T` for hooks to consume
- Exposes `subscribe(viewName: string, callback: (view) => void)` for reactive updates

**Snapshot handling (PRS §6):**
- Every 50 events on QueueEntry aggregate → write snapshot
- Every 30 events on BarberLane aggregate → write snapshot
- Every 20 events on Transaction aggregate → write snapshot
- On cold start: load latest valid snapshot, replay only events after snapshot HLC

**Verification:** Insert events into journal. `getView('QueueBoardView')` returns the correct view without calling any action or UI function.

---

### P2.2 — QueueBoard Projection

**File:** `src/core/projection/queue-board.projection.ts`  
**View type:** `src/projections/queue-board.view.ts`

**View model:**
```typescript
export interface QueueBoardView {
  entries: QueueEntryView[];           // HLC-ordered, preference preserved
  reservations: ReservationView[];     // RESERVED state entries
  totalWaiting: number;
  lastUpdatedHLC: string;
}

export interface QueueEntryView {
  queue_entry_id: string;
  customer_display_name: string;       // Initials only — privacy rule
  preferred_barber_id: string | null;
  status: 'RESERVED' | 'WAITING' | 'CALLED' | 'EXPIRED' | 'CANCELLED';
  checkin_hlc: string;
  position: number;                    // 1-indexed position in lane queue
  estimated_wait_minutes: number;      // Computed from projection, NOT stored
  reservation_expiry_hlc?: string;     // For RESERVED entries
  intents: string[];                   // service_ids from EVENT 21/22
  is_intent_locked: boolean;           // true after EVENT 04 on this entry
}
```

**Consumes events (ECS §3):** 01, 03, 12, 19, 20, 21, 22, 25  
**Ordering rule:** HLC ascending. Never reorder for optimization. VAO applies only within First-Available pool (PRD §7.3) — offset is exactly -15 minutes, boundary is 20 minutes.

---

### P2.3 — BarberLane Projection

**File:** `src/core/projection/barber-lane.projection.ts`  
**View type:** `src/projections/barber-lane.view.ts`

**View model:**
```typescript
export interface BarberLaneState {
  lanes: BarberLaneView[];
}

export interface BarberLaneView {
  barber_id: string;
  barber_name: string;
  status: 'AVAILABLE' | 'CALLED' | 'IN_SERVICE' | 'ON_BREAK' | 'OFFLINE';
  current_customer?: QueueEntryView;
  schedule_rules: ScheduleRule[];      // From EVENT 23
  estimated_completion_hlc?: string;   // Computed, not stored
}
```

**Consumes events:** 02, 03, 04, 05, 23

---

### P2.4 — Transaction Projection

**File:** `src/core/projection/transaction.projection.ts`  
**View type:** `src/projections/transaction-ledger.view.ts`

**View model:**
```typescript
export interface TransactionView {
  transaction_id: string;
  status: 'INITIALIZED' | 'PAYMENT_PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';
  barber_id: string;
  customer_uuid: string;
  service_snapshot: ServiceIntent[];   // Locked at EVENT 04
  base_price_etb: number;
  tip_etb: number;
  total_etb: number;
  payment_method?: 'CASH' | 'TELEBIRR' | 'CHAPA' | 'CBE_BIRR' | 'MPESA';
  is_settled: boolean;
  started_hlc: string;
  completed_hlc?: string;
}
```

**Consumes events:** 04, 05, 06, 07, 08, 09  
**Critical:** `service_snapshot` is locked at EVENT 04. Subsequent EVENT 21/22 MUST NOT modify it.

---

### P2.5 — Availability Projection

**File:** `src/core/projection/availability.projection.ts`  
**View type:** `src/projections/availability.view.ts`

**Consumes events:** 19, 20, 23, 24, 05 (for duration averages)  
**Projection rule (PRS §4.3):** Duration = arithmetic mean of `(EVENT 05 HLC − EVENT 04 HLC)` for last 50 transactions per `service_id`. Duration values are computed here, NEVER stored in the journal.  
**Owner:** Cloud Authority primary, local read-only cache secondary.  

---

## Phase 3 — Actions (Event Creators)

**Goal:** Typed, validated functions that UI calls to emit events.  
**Test:** Each action creator returns the correct event object without side effects.

**Every action creator follows this signature:**
```typescript
export async function checkInCustomer(
  params: CheckInParams,
  session: ActiveSession
): Promise<CommitResult>
```

Action creators call `journalService.commitEvent()`. They do NOT manipulate state. They do NOT read from the projection layer.

### P3.1 — Session Actions (`src/core/actions/session.actions.ts`)
- `openSession(pin: string, terminal_id: string): Promise<ActiveSession | null>`
  - Validates PIN against local credential store
  - Commits EVENT 13
  - Writes `ActiveSession` to `sessionStorage`
  - Returns `ActiveSession` or null on invalid PIN
- `closeSession(session: ActiveSession): Promise<void>`
  - Commits EVENT 14
  - Clears `sessionStorage`

### P3.2 — Queue Actions (`src/core/actions/queue.actions.ts`)
- `checkInCustomer(params, session)` → EVENT 01
- `checkInReservedCustomer(params, session)` → EVENT 01 with `reservation_id`
- `callToChair(queue_entry_id, barber_id, session)` → EVENT 03
- `addServiceIntent(queue_entry_id, service_id, session)` → EVENT 21 (rejected if EVENT 04 exists)
- `removeServiceIntent(queue_entry_id, service_id, session)` → EVENT 22 (rejected if EVENT 04 exists)
- `consentTransfer(params, session)` → EVENT 12
- `cancelReservation(queue_entry_id, session)` → EVENT 20

### P3.3 — Barber Actions (`src/core/actions/barber.actions.ts`)
- `setAvailable(barber_id, session)` → EVENT 02
- `startService(queue_entry_id, session)` → EVENT 04
- `completeService(transaction_id, session)` → EVENT 05
- `updateSchedule(params, session)` → EVENT 23

### P3.4 — Transaction Actions (`src/core/actions/transaction.actions.ts`)
- `initializeBilling(transaction_id, session)` → EVENT 06
- `setProcessing(transaction_id, session)` → EVENT 07
- `requestSettlement(transaction_id, session)` → Does NOT emit EVENT 08. Makes Cloud API request. Cloud emits EVENT 08 on success.
- `appendAdjustment(original_transaction_id, params, session)` → EVENT 09 (Admin only — enforced by role check)

### P3.5 — Schedule Actions (`src/core/actions/schedule.actions.ts`)
- `updateBarberSchedule(params, session)` → EVENT 23
- `overrideShopHours(params, session)` → EVENT 24 (Admin only — enforced by role check)

---

## Phase 4 — Runtime & Sync

**Goal:** Application starts correctly, bootstrap runs in order, sync runs as background service.

### P4.1 — Runtime Bootstrap (`src/core/runtime/runtime.ts`)

**Bootstrap sequence (order matters):**
1. `terminalIdentity.init()` — ensure terminal_id exists
2. `initializeDatabase()` — open RxDB, register all schemas
3. `clockService` — initialize HLC from last known state in localStorage
4. `projectionEngine.init()` — load snapshots, replay journal, start live subscription
5. `syncEngine.start()` — begin background sync loop
6. Return `{ ready: true }`

**Cold start recovery (TAS §10):**
- WAL recovery: RxDB handles this automatically
- Journal replay: projection engine handles this
- If journal checksum fails → wipe local db, pull from cloud (flag to user)

### P4.2 — RuntimeProvider (`src/ui/providers/RuntimeProvider.tsx`)

Wraps all operational screens. Calls `runtime.init()` once. Shows loading state during bootstrap. Redirects to `/login` if no session. Provides `RuntimeContext` with sync status.

### P4.3 — Sync Engine (`src/core/sync/sync.engine.ts`)

- Polls RxDB for `synced: false` events every 60 seconds (interval-driven)
- Also triggers immediately on each new `commitEvent()` (event-driven)
- Builds batches of ≤100 events, HLC-ordered
- POST to `/api/sync/push`
- On 200 ACK: marks events `synced: true` in RxDB
- On failure: exponential backoff with jitter (base: 2s, max: 5 minutes)
- Pulls Cloud events (08, 11, 15, 16, 19) via RxDB replication or periodic GET
- Incoming events go through `journalService.commitEvent()` with `actor_id: 'CLOUD'`

---

## Phase 5 — UI Hooks

**Goal:** Typed, reactive bridges between projections and UI components.

Each hook:
- Calls `projectionEngine.subscribe(viewName, callback)` in `useEffect`
- Returns the current view state
- Returns an `isLoading` flag (true until first projection is ready)
- Unsubscribes on component unmount

```typescript
// Pattern for all hooks
export function useQueueBoard() {
  const [view, setView] = useState<QueueBoardView | null>(null);
  
  useEffect(() => {
    const unsub = projectionEngine.subscribe('QueueBoardView', setView);
    return unsub;
  }, []);
  
  return { view, isLoading: view === null };
}
```

Hooks to build: `useQueueBoard`, `useBarberLane`, `useTransaction`, `useSession`, `useSyncStatus`

---

## Phase 6 — Operational Screens

**Build order within phase:** Login → Cashier → Barber → Settlement → Admin

Each screen:
1. Uses `useSession()` — if null, redirects to `/login`
2. Uses role check — if wrong role, redirects to `/login`
3. Uses the appropriate projection hook
4. Calls action creators on user interaction
5. Follows `ui-standards.md` for all visual decisions

**Screen-to-module mapping (AMS v1.3):**

| Screen | Module | Primary Hook | Primary Actions |
|---|---|---|---|
| OperatorLoginScreen | Terminal Operations | useSession | session.actions |
| CashierScreen | Concierge & Check-in | useQueueBoard | queue.actions |
| BarberDashboardScreen | Lane Cockpit | useBarberLane | barber.actions |
| SettlementScreen | Settlement Desk | useTransaction | transaction.actions |
| AdminScreen | Admin Governance | all hooks | all actions |

---

## Phase 7 — Public-Facing Screens

### P7.1 — Status Board (`/status`)

- No session required
- Uses `useQueueBoard()` and `useBarberLane()`
- Read-only. No action creators.
- Shows: queue position, barber availability, estimated wait
- Does NOT show: financial data, customer PII beyond initials, loyalty tier
- "Cinema Dark" full-screen display mode
- Bilingual EN/AM toggle

### P7.2 — Landing Page (`/`)

- Fully static. No `RuntimeProvider`. No hooks.
- Uses `AnimateIn` for scroll reveals.
- Sections: Hero, Services, How It Works, About, Contact, CTA

### P7.3 — Reserve Screen (`/reserve`)

- No session. Customer-facing.
- Reads `AvailabilityCalendar` from Cloud API (not local projection)
- Triggers `APPOINTMENT_RESERVED` via Cloud API (EVENT 19 — Cloud Authority only)
- Deferred to Phase 8 (requires cloud infrastructure)

---

## Phase 8 — Cloud Integration

**Prerequisite:** All Phase 1–7 items complete and tested.

### P8.1 — Supabase Schema

Postgres tables matching `CloudLedgerSchemas` from `local-journal-cloud-ledger.ts`. Row-Level Security (RLS) policies for each aggregate.

### P8.2 — Sync API Endpoint

`POST /api/sync/push` — receives event batches from terminals, validates signatures, idempotently inserts into Supabase, returns ACK.

### P8.3 — Payment Webhook Handler

`POST /api/webhooks/payment` — receives Telebirr/Chapa callbacks, validates HMAC, emits `EVENT 08 — PAYMENT_SETTLED` to Supabase, triggers RxDB pull replication to terminals.

### P8.4 — Reservation API

`POST /api/reserve` — validates slot availability from `AvailabilityCalendar`, emits `EVENT 19 — APPOINTMENT_RESERVED`, returns confirmation.

---

## What "Done" Means For Each Phase

| Phase | Done When |
|---|---|
| P1 | `commitEvent()` writes a valid event to RxDB. Invalid events are rejected with correct reason codes. |
| P2 | Seeding 10 events into the journal produces the correct `QueueBoardView` without calling any UI or action code. |
| P3 | Every action creator in the table above exists, is typed, and calls `commitEvent()`. No action mutates state directly. |
| P4 | App loads in browser. Bootstrap runs in order. `projectionEngine.getView()` returns data. Sync engine starts. |
| P5 | `useQueueBoard()` in a test component returns live data that updates when a new event is committed. |
| P6 | All operational screens render without error. Session guard works. Role guard works. Actions emit events. |
| P7 | Status board is displayable on a TV screen. Landing page scores 90+ on Lighthouse. |
| P8 | A test payment via Telebirr sandbox results in `EVENT 08` appearing in local journal via sync. |

---

## Current Status Assessment (as of project tree review)

| Item | Status | Notes |
|---|---|---|
| `src/core/db/database.ts` | ⚠️ Exists but schema incomplete | Missing `synced` field, `signature`, `terminal_id` in metadata |
| `src/core/clock/hlc.ts` | ✅ Exists | Verify monotonicity guarantee |
| `src/core/clock/clock.service.ts` | ✅ Exists | Verify `clockService.now()` uses HLC not `Date.now()` |
| `src/core/terminal/terminal.identity.ts` | ✅ Exists | Verify persistence across reload |
| `src/core/journal/journal.service.ts` | ⚠️ Exists but missing guards | Add INTENT_LOCK check, CLOUD_AUTHORITY check, signature |
| `src/core/projection/projection.engine.ts` | ⚠️ Exists but incomplete | Missing snapshot logic, missing live subscription |
| `src/core/projection/queue-board.projection.ts` | ⚠️ Exists but needs view type alignment | Align with QueueBoardView spec above |
| `src/core/actions/queue.actions.ts` | ⚠️ Exists | Audit against action list above |
| `src/core/runtime/runtime.ts` | ⚠️ Exists | Verify bootstrap order |
| `src/core/sync/` | ❌ Empty | Phase 4.3 — build sync engine |
| `src/projections/` | ❌ Empty | Phase 2 — define view types here |
| `src/domain/events/event.definitions.ts` | ✅ Exists | Verify all 25 payloads defined |
| `local-journal-cloud-ledger.ts` (root) | ⚠️ Wrong location | Move to `src/core/db/` and split by aggregate |
| `src/ui/hooks/useQueueBoard.ts` | ⚠️ Exists | Verify it reads projection, not raw RxDB |
| Operational screens | ❌ Not built | Phase 6 |
| Sync engine | ❌ Not built | Phase 4.3 |
| `/reserve` route | 404 | Phase 7.3 — deferred to Phase 8 |

**Recommended next action:** Complete Phase 1 items that have gaps (journal.service.ts guards, schema fields), then build all Phase 2 projection view types before touching any UI screen.

---

*MODULE_PRIORITY.md v1.0 — Uncle Grooming Hub*

---

## Amendments — v1.1 (Added without removing anything above)

The following additions reflect decisions made after initial publication. All phase numbers and existing content above remain unchanged.

### New Items Added to Dependency Graph

```
PHASE 3 additions:
    └── P3.6 — Staff Actions         (needs P1.5) — Events 27–31

PHASE 4 additions:
    └── P4.4 — Pusher Server Client  (needs P4.1) — real-time push

PHASE 5 additions:
    └── P5.6 — usePusher             (needs P4.4)
    └── P5.7 — useNotification       (needs P5.6)

PHASE 6 additions:
    └── P6.6 — Staff Management UI   (needs P6.5, P3.6) — inside Admin panel

PHASE 7 additions:
    ├── P7.4 — Customer Tracking Page (needs P5.6, Cloud API)
    ├── P7.5 — Payment Dashboard      (needs Cloud API, Pusher)
    └── P7.6 — Bootstrap Screen       (one-time setup, needs Cloud API)
```

---

### P3.6 — Staff Actions (`src/core/actions/staff.actions.ts`)

New actions covering Events 27–31 (see STAFF_ONBOARDING.md §6):

- `createStaffAccount(params, session)` → EVENT 27 (Admin/Owner only)
- `changeStaffPin(params, session)` → EVENT 28 (self or Admin)
- `deactivateStaffAccount(target_actor_id, reason, session)` → EVENT 29 (Admin/Owner only)
- `reactivateStaffAccount(target_actor_id, session)` → EVENT 30 (Admin/Owner only)
- `changeTerminalPin(terminal_id, new_pin_hash, session)` → EVENT 31 (Admin/Owner only)

All role checks enforced inside `journal.service.ts` — not just in the action creator.

---

### P4.4 — Pusher Server Client (`src/core/realtime/pusher.server.ts`)

Server-side Pusher instance used to trigger events from API routes.

```typescript
import Pusher from 'pusher';

export const pusherServer = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true,
});
```

Called from `src/app/api/sync/push/route.ts` after each event batch is committed to Supabase. The API route determines which Pusher channels to trigger based on the event types in the batch.

Also exists: `src/core/realtime/pusher.client.ts` — browser-side Pusher instance used by hooks.

**Pusher free tier limits:** 200,000 messages/day, 100 simultaneous connections. Sufficient for a single shop. If the shop scales to 500+ customers/day, upgrade to Pusher Starter ($49/month) or switch to self-hosted Soketi (free, same API).

---

### P5.6 — usePusher Hook (`src/ui/hooks/usePusher.ts`)

Wraps Pusher client subscription. Used by tracking page and operational screens for real-time updates.

```typescript
export function usePusherChannel(channelName: string) {
  // Subscribes on mount, unsubscribes on unmount
  // Returns bind() and unbind() for event listeners
}
```

### P5.7 — useNotification Hook (`src/ui/hooks/useNotification.ts`)

Manages in-app toast notifications. Consumes Pusher events and converts them to visible toasts.

```typescript
export function useNotification() {
  // Returns: { notifications: Notification[], dismiss(id) }
}
```

The `<NotificationToast />` component renders these. Always position-fixed, above all content, within safe viewport area.

---

### P6.6 — Staff Management UI (inside Admin Panel)

New section within `<AdminScreen />`. Two sub-views:

**Staff List & Management:**
- Lists all staff with role, status, last login
- Add Staff button → form → EVENT 27
- Per-staff actions: Edit, Reset PIN (EVENT 28), Deactivate (EVENT 29), Reactivate (EVENT 30)
- Barber detail: shows aggregate tip earnings (delayed batch), recent services

**Terminal Management:**
- Lists all registered terminals with nickname and last-seen HLC
- Register New Terminal → pairing flow (see STAFF_ONBOARDING.md §10)
- Change Desk PIN per terminal → EVENT 31

---

### P7.4 — Customer Tracking Page (`/track/[token]`)

**Dependencies:** Pusher client (P4.4/P5.6), Cloud API to resolve token → QueueEntry state  
**No session required.** Public page.

What it builds:
- Resolves `queue_token` from URL → fetches current QueueEntry state from Cloud API
- Subscribes to `queue-token-{TOKEN}` Pusher channel
- Renders live queue position, services, estimated wait
- Shows QR scan link when payment intent is ready
- Shows post-payment account creation prompt after `payment.settled` event
- Cancel button emits `EVENT 20` via Cloud API (before `EVENT 04` only)

**Done when:** Customer can open `/track/A-07` on their phone, see their live position, and see the page update automatically when the barber calls them without any manual refresh.

---

### P7.5 — Payment Dashboard (`/pay/[intent_id]`)

**Dependencies:** Cloud API, Pusher client, Telebirr/Chapa gateway  
**No session required.** Public page. Customer opens this by scanning the QR code.

What it builds:
- Resolves `payment_intent_id` → fetches transaction details (service items, subtotal)
- Shows itemized service list (read-only)
- Shows barber tip options (pre-built amounts + custom field)
- Shows cashier/desk tip options (pre-built amounts + custom field)
- Total updates live as tip amounts change
- Payment gateway buttons (Telebirr, Chapa) — redirect to gateway checkout
- "Pay cash at desk" option — marks intent as cash pending
- Subscribes to Pusher `queue-token-{TOKEN}` for `payment.settled` → shows confirmation

**Critical:** This page NEVER shows the tip breakdown back to any staff screen. It handles tip input and passes the final total to the gateway. The ledger split happens server-side after webhook confirmation.

**Done when:** Customer scans QR, sees their services and total, adds a tip, taps Telebirr, pays, and sees confirmation on this page — and simultaneously the cashier terminal shows "payment settled" without ever seeing the tip.

---

### P7.6 — Bootstrap Screen (`/setup/bootstrap`)

**One-time only.** Disabled by the server after first use.

What it builds:
- Simple form: owner name, phone, password, confirm password
- On submit: calls `POST /api/setup/bootstrap` (which self-disables after success)
- Creates System Owner account
- Redirects to `/admin` with the new session

**Security:** The `/api/setup/bootstrap` endpoint checks a `BOOTSTRAP_COMPLETE` flag in the database. If already set, returns 403. This prevents any second owner from being created this way.

---

### Updated Domain Event Types

`event.types.ts` must include these additions:

```typescript
// These were in the original 24-event list — unchanged
// Added in v1.4 (ECS amendment):
| 'CUSTOMER_NOTIFICATION_SENT'   // EVENT 26 — Cloud Authority only
| 'STAFF_ACCOUNT_CREATED'        // EVENT 27 — Admin/Owner only
| 'STAFF_PIN_CHANGED'            // EVENT 28 — self or Admin
| 'STAFF_ACCOUNT_DEACTIVATED'    // EVENT 29 — Admin/Owner only
| 'STAFF_ACCOUNT_REACTIVATED'    // EVENT 30 — Admin/Owner only
| 'TERMINAL_PIN_CHANGED'         // EVENT 31 — Admin/Owner only
```

Total events: 31 (was 24 in ECS v1.3, plus existing system events = 31 named types).

---

### Updated Current Status Assessment

| Item | Status | Notes |
|---|---|---|
| All items from v1.0 table | See original table above | Unchanged |
| `src/core/realtime/pusher.client.ts` | ❌ Not built | Phase 4.4 |
| `src/core/realtime/pusher.server.ts` | ❌ Not built | Phase 4.4 |
| `src/ui/hooks/usePusher.ts` | ❌ Not built | Phase 5.6 |
| `src/ui/hooks/useNotification.ts` | ❌ Not built | Phase 5.7 |
| `src/core/actions/staff.actions.ts` | ❌ Not built | Phase 3.6 |
| `/track/[token]` route | ❌ Not built | Phase 7.4 |
| `/pay/[intent_id]` route | ❌ Not built | Phase 7.5 |
| `/setup/bootstrap` route | ❌ Not built | Phase 7.6 |
| Event types 26–31 | ❌ Not in event.types.ts | Add to Phase 1.4 |
| Login screen (credentials only) | ❌ Not built yet | Phase 6.1 — no role selector |
| Cashier tip display rule | 📋 Spec complete | Enforce in Phase 6.2 build |
| Pusher environment vars | ❌ Not configured | Add to .env.local before Phase 4.4 |

**Environment variables needed before Phase 4.4:**
```
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

---

*MODULE_PRIORITY.md — Amendment v1.1*  
*Nothing removed. All original content intact above.*
