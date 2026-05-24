# AGENT.md — Uncle Grooming Hub
## Constitutional Instruction Document for All Agents

**Read this file completely before touching any file in this project.**
**This is not optional. This is not a summary. Read every word.**

**Authority chain:** AGENT.md → ECS v1.3 → TAS v1.0 → AMS v1.3 → PRS v1.1 → IMS v1.1 → ui-standards.md  
**Stack:** Next.js 16 (App Router, Turbopack), Tailwind v4, Framer Motion 11, RxDB 17, TypeScript strict  
**Pattern:** Offline-First Event Sourcing. Local Authority. Append-Only Journal. HLC Total Ordering.

---

## 0. The Mental Model — Read This First

This system is NOT a typical CRUD app with a database. It is an **event-sourced, offline-first distributed system**. If you do not understand what that means, stop and re-read this section.

**How state works in this system:**

```
User Action
    ↓
Emit ONE ECS Event → commitEvent() → RxDB Local Journal (append only)
    ↓
Projection Engine reads Journal → produces Materialized View
    ↓
React UI subscribes to Materialized View → renders
    ↓
(Async) Sync Engine pushes Journal to Cloud
```

**What this means in practice:**

- There is NO `setState` that holds domain data. UI state = projection output only.
- There is NO `UPDATE` or `DELETE` anywhere in the codebase, ever.
- There is NO direct database read from UI components.
- There is NO business logic in UI components.
- There is NO "fetch and display" pattern. Data flows one way: Journal → Projection → View → UI.
- A "button click" does not update state. It emits an event. The projection re-runs. The UI re-renders.

If you find yourself writing code that contradicts any of the above, STOP. You are building the wrong thing.

---

## 1. Layer Architecture — The Absolute Law

The codebase has exactly six layers. Each layer has ONE job. Layers only communicate downward (UI → Hooks → Projections → Engine → Journal → DB). No layer skips another. No layer reaches upward.

```
┌─────────────────────────────────────────────────────┐
│  LAYER 6: UI (src/ui/)                               │
│  Job: Render projection output. Emit events on       │
│  user action. Nothing else.                          │
├─────────────────────────────────────────────────────┤
│  LAYER 5: Hooks (src/ui/hooks/)                      │
│  Job: Subscribe to projections. Expose typed view    │
│  models to UI. Handle optimistic feedback.           │
├─────────────────────────────────────────────────────┤
│  LAYER 4: Projection Engine (src/core/projection/)   │
│  Job: Read Journal. Produce Materialized Views.      │
│  Pure functions only. No side effects.               │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Journal Service (src/core/journal/)        │
│  Job: Validate events. Enforce version checks.       │
│  Append to RxDB. Reject anything invalid.            │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Core Services (src/core/)                  │
│  Job: HLC clock, terminal identity, runtime          │
│  bootstrap, sync engine. Infrastructure only.        │
├─────────────────────────────────────────────────────┤
│  LAYER 1: Database (src/core/db/)                    │
│  Job: RxDB schema definitions and initialization.    │
│  No logic. No queries beyond what RxDB provides.     │
└─────────────────────────────────────────────────────┘
```

**Violation examples — these are BUGS, not style choices:**

| What you might want to write | Why it's wrong | What to write instead |
|---|---|---|
| `const queue = await db.queue.find().exec()` in a React component | UI reads journal directly | Use `useQueueBoard()` hook which reads the projection |
| `setQueueState([...newItems])` in a component | UI manages domain state | Emit event → projection updates → hook re-renders |
| `if (queue.length > 0) { queue[0].status = 'called' }` | Mutation of projected state | Emit `CUSTOMER_CALLED_TO_CHAIR` event via `commitEvent()` |
| `const duration = endTime - startTime` in UI | UI computes domain values | Projection engine computes duration from HLC delta |
| Calling `journalService.appendEvent()` from a UI component | UI bypasses hook layer | Use action in `src/core/actions/` called from hook |

---

## 2. File System Contract

Every file in this project lives in exactly one place. Do not create files outside these directories.

```
src/
├── app/                    Next.js App Router pages ONLY. No logic.
│   ├── page.tsx            → renders <LandingPage />
│   ├── status/page.tsx     → renders <StatusBoardScreen />
│   ├── login/page.tsx      → renders <OperatorLoginScreen />
│   ├── cashier/page.tsx    → renders <CashierScreen />
│   ├── barber/[id]/page.tsx→ renders <BarberDashboardScreen />
│   ├── settlement/page.tsx → renders <SettlementScreen />
│   ├── admin/page.tsx      → renders <AdminScreen />
│   └── reserve/page.tsx    → renders <ReserveScreen />
│
├── core/
│   ├── db/
│   │   ├── database.ts         RxDB init. Schema registration. Nothing else.
│   │   └── schemas/            One file per aggregate schema.
│   │       ├── queue-entry.schema.ts
│   │       ├── barber-lane.schema.ts
│   │       ├── transaction.schema.ts
│   │       ├── customer-profile.schema.ts
│   │       ├── terminal-session.schema.ts
│   │       └── system-process.schema.ts
│   │
│   ├── clock/
│   │   ├── hlc.ts              HLC implementation. Pure functions only.
│   │   └── clock.service.ts    Singleton clock service.
│   │
│   ├── journal/
│   │   ├── event.types.ts      TypeScript types for all 25 ECS events.
│   │   ├── journal.schema.ts   RxDB schema for journal collection.
│   │   └── journal.service.ts  commitEvent(). validate(). The only write path.
│   │
│   ├── projection/
│   │   ├── projection.engine.ts        Orchestrates all projectors. Handles replay.
│   │   ├── queue-board.projection.ts   QueueBoardView materializer.
│   │   ├── barber-lane.projection.ts   BarberLaneState materializer.
│   │   ├── availability.projection.ts  AvailabilityCalendar materializer.
│   │   └── transaction.projection.ts   TransactionLedgerView materializer.
│   │
│   ├── actions/
│   │   ├── queue.actions.ts        Typed action creators for queue events.
│   │   ├── barber.actions.ts       Typed action creators for barber events.
│   │   ├── transaction.actions.ts  Typed action creators for financial events.
│   │   ├── schedule.actions.ts     Typed action creators for schedule events.
│   │   └── session.actions.ts     Typed action creators for session events.
│   │
│   ├── terminal/
│   │   └── terminal.identity.ts    Hardware-bound terminal_id. Singleton.
│   │
│   ├── sync/
│   │   ├── sync.engine.ts          Push-pull-reconcile. Batch construction.
│   │   ├── sync.queue.ts           Pending event buffer. Retry logic.
│   │   └── idempotency.guard.ts    Duplicate event_id detection.
│   │
│   ├── runtime/
│   │   └── runtime.ts              Bootstrap sequence. Wires all core services.
│   │
│   └── bootstrap.ts                Entry point called once on app start.
│
├── domain/
│   └── events/
│       ├── event.definitions.ts    ECS event payload shapes (all 25 events).
│       └── event.types.ts          EventType union type.
│
├── projections/                    Materialized view TypeScript types.
│   ├── queue-board.view.ts
│   ├── barber-lane.view.ts
│   ├── availability.view.ts
│   └── transaction-ledger.view.ts
│
└── ui/
    ├── components/
    │   ├── primitives/             Atoms: Button, Badge, Card, Input, etc.
    │   │                           These have NO domain knowledge.
    │   ├── operational/            Molecules for operational screens.
    │   │   ├── QueueEntry.tsx
    │   │   ├── BarberLaneCard.tsx
    │   │   ├── SyncStatusBar.tsx
    │   │   └── IntentList.tsx
    │   └── public/                 Components for landing/status/reserve.
    │
    ├── hooks/                      One hook per projection view.
    │   ├── useQueueBoard.ts        → subscribes to QueueBoardView
    │   ├── useBarberLane.ts        → subscribes to BarberLaneState
    │   ├── useTransaction.ts       → subscribes to TransactionLedgerView
    │   ├── useSession.ts           → reads sessionStorage ActiveSession
    │   └── useSyncStatus.ts       → reads sync engine state
    │
    ├── providers/
    │   └── RuntimeProvider.tsx     Initializes runtime. Guards all op screens.
    │
    └── screens/                    One file per route. Composes hooks + components.
        ├── LandingPage.tsx
        ├── StatusBoardScreen.tsx
        ├── OperatorLoginScreen.tsx
        ├── CashierScreen.tsx
        ├── BarberDashboardScreen.tsx
        ├── SettlementScreen.tsx
        ├── AdminScreen.tsx
        └── ReserveScreen.tsx
```

**File placement rules:**
- If it touches the database directly → it lives in `src/core/db/` or `src/core/journal/`
- If it computes state from events → it lives in `src/core/projection/`
- If it creates event objects → it lives in `src/core/actions/`
- If it renders pixels → it lives in `src/ui/`
- If it bridges projection to render → it lives in `src/ui/hooks/`
- App Router pages (`src/app/`) contain NOTHING except a default export that renders one screen component

---

## 3. The Event Contract — Never Violate This

Every event emitted in this system MUST conform to ECS v1.3. Before writing any `commitEvent()` call, verify all of these:

**Pre-emission checklist:**
- [ ] The event type exists in `EventType` union (domain/events/event.types.ts)
- [ ] The actor has the authority to emit this event (check ECS §2.4 Authority Boundaries)
- [ ] The precondition for this event is met (check ECS §3 Canonical Event Catalog)
- [ ] The `aggregate_version` is `current_version + 1` (optimistic concurrency)
- [ ] The `event_id` is a fresh UUID v7 (never reuse)
- [ ] The `hlc_timestamp` comes from `clockService.now()` (never `Date.now()`)
- [ ] The `session_id` comes from `sessionStorage` `ActiveSession` (never hardcoded)
- [ ] The `terminal_id` comes from `terminalIdentity.getId()` (never hardcoded)

**The 5 hard invariants — violation = bug, not opinion:**

1. **APPEND_ONLY:** `commitEvent()` is the only write function. No update, no delete, no upsert, no patch. If you need to correct state, emit `EVENT 09 — ADJUSTMENT_EVENT`.

2. **INTENT_LOCK:** `EVENT 21` (SERVICE_INTENT_ADDED) and `EVENT 22` (SERVICE_INTENT_REMOVED) MUST be rejected if the associated Transaction aggregate already contains `EVENT 04` (SERVICE_ENGAGED). Enforce this in `journal.service.ts`, not in UI.

3. **CLOUD_AUTHORITY:** `EVENT 08` (PAYMENT_SETTLED) and `EVENT 19` (APPOINTMENT_RESERVED) MUST NEVER be emitted by local terminal code. They are cloud-only. Local code may REQUEST settlement, never confirm it.

4. **PREFERENCE_SOVEREIGNTY:** Queue ordering is never modified automatically. No sort, no reorder, no optimization of customer position without explicit `EVENT 12` (QUEUE_TRANSFER_CONSENTED). This applies to projection code too.

5. **HLC_ONLY:** Wall-clock (`Date.now()`, `new Date()`) is NEVER used for event ordering, sequencing, or business logic. Only `clockService.now()` returns an HLC timestamp. Wall-clock may only appear in UI display labels.

---

## 4. Authority Boundaries — Who Can Emit What

Before writing any action creator, confirm the emitter against this table. Wrong authority = invalid event, sync rejection, and potential ledger corruption.

| Event | Number | Local Terminal | Cloud Only | System (Deterministic) |
|---|---|---|---|---|
| CUSTOMER_CHECKED_IN | 01 | ✅ Cashier | | |
| BARBER_AVAILABLE | 02 | ✅ Barber | | |
| CUSTOMER_CALLED_TO_CHAIR | 03 | ✅ Cashier/Admin | | |
| SERVICE_ENGAGED | 04 | ✅ Barber | | |
| SERVICE_COMPLETED | 05 | ✅ Barber | | |
| PAYMENT_INTENT_CREATED | 06 | ✅ Cashier | | |
| PAYMENT_PROCESSING | 07 | ✅ Cashier | | |
| PAYMENT_SETTLED | 08 | ❌ FORBIDDEN | ✅ Cloud only | |
| ADJUSTMENT_EVENT | 09 | ✅ Admin | | |
| ACCOUNT_VERIFIED | 10 | ✅ Cashier | | |
| QUEUE_TRANSFER_CONSENTED | 12 | ✅ Cashier | | |
| OPERATOR_SESSION_OPENED | 13 | ✅ Any operator | | |
| OPERATOR_SESSION_CLOSED | 14 | ✅ Any operator | | |
| APPOINTMENT_RESERVED | 19 | ❌ FORBIDDEN | ✅ Cloud only | |
| RESERVATION_CANCELLED | 20 | ✅ Local OR | ✅ Cloud OR | |
| SERVICE_INTENT_ADDED | 21 | ✅ Local OR | ✅ Cloud OR | |
| SERVICE_INTENT_REMOVED | 22 | ✅ Local OR | ✅ Cloud OR | |
| BARBER_SCHEDULE_UPDATED | 23 | ✅ Barber/Admin | | |
| SHOP_HOURS_CHANGED | 24 | ✅ Admin only | | |
| RESERVATION_EXPIRED | 25 | | | ✅ System/deterministic |

**Dual-authority events (20, 21, 22):** When both local and cloud can emit the same event type, the HLC timestamp is the tie-breaker. Cloud events arrive via sync and are inserted into the journal by the sync engine, not by action creators.

---

## 5. Projection Rules — The View Contract

Projections are pure functions. They receive events in HLC order and return a typed view object. They have no side effects, no async operations, no database writes.

**A valid projector looks like this:**
```typescript
// CORRECT
export function projectQueueBoard(events: JournalEvent[]): QueueBoardView {
  return events
    .sort(byHLC)
    .reduce(applyQueueEvent, initialQueueBoardView());
}

function applyQueueEvent(view: QueueBoardView, event: JournalEvent): QueueBoardView {
  switch (event.event_type) {
    case 'CUSTOMER_CHECKED_IN': return { ...view, entries: [...view.entries, buildEntry(event)] };
    case 'CUSTOMER_CALLED_TO_CHAIR': return { ...view, entries: updateEntry(view.entries, event) };
    // etc.
    default: return view;
  }
}
```

**A projection MUST NOT:**
- Call `commitEvent()` or any write function
- Call `fetch()` or any async operation
- Read from `sessionStorage` or any browser API
- Import from `src/ui/` anything
- Compute wait-times or durations using wall-clock
- Sort queue entries by anything other than arrival HLC position (except VAO logic for Patron/Inner Circle tier, which is defined in PRD §7.3 — apply only within First-Available pool, never override Specific Barber preference)

**Duration and wait-time computation (PRS §5.5):**
- Service duration = arithmetic mean of `(EVENT 05 HLC − EVENT 04 HLC)` for last 50 transactions of that `service_id`
- Lane wait time = sum of projected durations for all ENGAGED or WAITING entries in a lane
- These values are computed by the projection, exposed in the view model, consumed by UI — never stored in the journal

---

## 6. UI Rules — What Screens Are Allowed To Do

**A UI screen component is allowed to:**
- Call hooks from `src/ui/hooks/`
- Render projection output (typed view models from hooks)
- Call action creators from `src/core/actions/` in response to user gestures
- Display optimistic feedback after an action is dispatched (while journal write is pending)
- Redirect to `/login` if `useSession()` returns null

**A UI screen component is NOT allowed to:**
- Import anything from `src/core/journal/` or `src/core/db/`
- Import anything from `src/core/projection/`
- Call `commitEvent()` directly
- Compute domain state (durations, wait times, queue position, totals)
- Store domain state in `useState` (exception: ephemeral UI state like modal open/closed, input field value)
- Make `fetch()` calls (except `src/app/reserve/` which may call the Cloud API for reservation)

**The only correct data flow in a screen:**
```typescript
// CORRECT screen pattern
export function CashierScreen() {
  const queue = useQueueBoard();           // Layer 5: Hook → Projection
  const { callToChair } = useQueueActions(); // Layer 5: Hook → Action

  return (
    <div>
      {queue.waitingEntries.map(entry => (  // Render projection output
        <QueueEntry
          key={entry.queue_entry_id}
          entry={entry}
          onCall={() => callToChair(entry)} // Emit event on gesture
        />
      ))}
    </div>
  );
}
```

---

## 7. Session Contract

The session is the cryptographic link between a human operator and the event stream. Every operational screen depends on it.

```typescript
// src/ui/hooks/useSession.ts reads this from sessionStorage
interface ActiveSession {
  session_id:  string;  // UUID — included in ALL event metadata.session_id
  actor_id:    string;  // Operator UUID
  role:        "BARBER" | "CASHIER" | "ADMIN";
  actor_name:  string;
  terminal_id: string;  // From terminalIdentity.getId()
  opened_at:   string;  // HLC timestamp from clockService.now()
}
```

**Session rules:**
- Session is created when `EVENT 13 — OPERATOR_SESSION_OPENED` is committed
- Session is stored in `sessionStorage` (cleared on tab/browser close)
- All operational screens MUST redirect to `/login` if session is null
- The `session_id` from the active session MUST be included in `metadata.session_id` of every event emitted during that session
- Session is closed by committing `EVENT 14 — OPERATOR_SESSION_CLOSED` (logout)
- `/status` (Public Status Board) and `/reserve` (Customer App) do NOT require a session

---

## 8. Sync Engine Rules

The sync engine runs as a background service. It is not a screen, not a hook, not a component.

**Sync engine responsibilities:**
- Watches RxDB for events where `synced = false`
- Bundles up to 100 events per batch, ordered by HLC
- Pushes batches to Cloud API endpoint
- Marks events `synced = true` ONLY after receiving verified ACK (200 OK with batch_id)
- On failure: exponential backoff with jitter, never clear the pending queue
- Receives Cloud-authority events (08, 11, 15, 16, 19) via pull replication
- Inserts received events into local journal via `journal.service.ts` (not directly to RxDB)
- Emits sync status readable by `useSyncStatus()` hook

**Idempotency:** `event_id` is the idempotency key. If the cloud returns 200 for an event_id it already has, treat it as success. Never re-emit with a new event_id.

---

## 9. Build Verification — Before You Submit Any Code

Before submitting any file, run through this checklist mentally:

**Core layer files:**
- [ ] Does this file write to RxDB anywhere other than `journal.service.ts`? → Remove it.
- [ ] Does this projection have any side effects or async calls? → Remove them.
- [ ] Does this action creator use `Date.now()` instead of `clockService.now()`? → Fix it.
- [ ] Does this schema file have any logic in it? → Remove it. Schemas are data, not code.

**UI layer files:**
- [ ] Does this component import from `src/core/journal/` or `src/core/db/`? → Wrong layer.
- [ ] Does this component have domain state in `useState`? → Move it to a hook and projection.
- [ ] Does this hook bypass the projection and query RxDB directly? → Use the projection engine.
- [ ] Does this screen exist without a corresponding route in `src/app/`? → Add the page.tsx.
- [ ] Does this component use `Date.now()` for ordering or business logic? → Use HLC from projection.

**Event emissions:**
- [ ] Is `EVENT 08` or `EVENT 19` emitted from local code? → Delete it. Cloud only.
- [ ] Is `EVENT 21` or `EVENT 22` emitted after `EVENT 04` on the same transaction? → Reject in journal.service.ts.
- [ ] Does the event include `aggregate_version` as `current_version + 1`? → Verify in journal.service.ts.
- [ ] Is the `hlc_timestamp` from `clockService.now()`? → Verify.

---

## 10. The One Rule Above All Others

**If you are unsure whether something is correct, do not guess. The ECS v1.3 document is the canonical truth for event behavior. The TAS v1.0 document is the canonical truth for infrastructure behavior. The AMS v1.3 document is the canonical truth for module responsibilities. Read the relevant section before writing the code.**

There is no such thing as "close enough" in an event-sourced, append-only, financially critical system. A wrong event emitted is a record that cannot be deleted — it can only be corrected with a compensating `ADJUSTMENT_EVENT`. Build it right the first time.

---

*AGENT.md v1.0 — Uncle Grooming Hub*  
*Authority: All documents in /docs/*  
*Any conflict between this document and the spec documents: the spec documents win.*

---

## 11. Additional Spec Documents (Read These Too)

The following documents extend the base specs and are equally authoritative:

| Document | Governs |
|---|---|
| `CUSTOMER_EXPERIENCE.md` (CXS v1.1) | All customer-facing flows: queue token, tracking page, payment dashboard, tip model, notifications, cancellation |
| `STAFF_ONBOARDING.md` (SOS v1.0) | Staff account lifecycle, personal vs. desk terminal PIN, new events 27–31, System Owner bootstrap |

---

## 12. New Events (ECS v1.4 — Pending)

These events are specified in `STAFF_ONBOARDING.md` §6 and `CUSTOMER_EXPERIENCE.md` §6.4. They must be added to `event.types.ts` and `event.definitions.ts`:

```typescript
| 'CUSTOMER_NOTIFICATION_SENT'   // EVENT 26 — Cloud Authority only
| 'STAFF_ACCOUNT_CREATED'        // EVENT 27 — Admin/Owner only
| 'STAFF_PIN_CHANGED'            // EVENT 28 — Self or Admin
| 'STAFF_ACCOUNT_DEACTIVATED'    // EVENT 29 — Admin/Owner only
| 'STAFF_ACCOUNT_REACTIVATED'    // EVENT 30 — Admin/Owner only
| 'TERMINAL_PIN_CHANGED'         // EVENT 31 — Admin/Owner only
```

**Authority rules for new events:**
- EVENT 26: Cloud Authority only — never emitted by local terminal code
- EVENT 27, 29, 30, 31: Local Authority, role must be `ADMIN` or `SYSTEM_OWNER` — enforced in `journal.service.ts`
- EVENT 28: Local Authority, role must be `SELF` (actor_uuid matches session actor_uuid) OR `ADMIN`/`SYSTEM_OWNER`

---

## 13. Updated RBAC — Roles

The system now has six roles (previously five). Add `SYSTEM_OWNER` to all role checks:

```typescript
type ActorRole = 'BARBER' | 'CASHIER' | 'ADMIN' | 'SYSTEM_OWNER' | 'CLOUD' | 'SYSTEM';
```

`SYSTEM_OWNER` has all permissions of `ADMIN` plus:
- Can create/deactivate Admin accounts
- Account cannot be deactivated (enforced in journal.service.ts)
- Can emit EVENT 27/29/30/31

---

## 14. Updated Session Contract

The `ActiveSession` interface gains one field:

```typescript
interface ActiveSession {
  session_id:  string;
  actor_id:    string;
  role:        'BARBER' | 'CASHIER' | 'ADMIN' | 'SYSTEM_OWNER';
  actor_name:  string;
  terminal_id: string;
  opened_at:   string;
  is_first_login: boolean;   // NEW — forces PIN change screen if true
}
```

---

## 15. Queue Token — New Payload Field

`EVENT 01 — CUSTOMER_CHECKED_IN` payload must include:

```typescript
queue_token: string   // e.g., "A-07" — generated by cashier terminal
```

`QueueBoardView` and `QueueEntryView` must expose `queue_token: string`.

The tracking URL `https://track.unclegroominghub.com/q/{queue_token}` is generated from this field.

---

## 16. Cashier Tip Wallet — Financial Model Update

Three wallets now exist per transaction (previously two):

1. Shared Business Wallet — base service price
2. Barber Partnership Wallet — barber tip
3. **Cashier Service Wallet** — desk/cashier tip (NEW)

Double-entry must balance: `total_paid = base + barber_tip + cashier_tip`

The `PAYMENT_INTENT_CREATED` payload (EVENT 06) must support:
```typescript
barber_tip_etb:   number   // default 0
cashier_tip_etb:  number   // default 0, NEW
total_etb:        number   // base + barber_tip + cashier_tip
```

*AGENT.md — Appendix added covering CXS v1.1, SOS v1.0, Events 26–31, updated roles and session contract.*
