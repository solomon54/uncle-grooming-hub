# Event Contract Specification (ECS) v1.3

**Project:** Uncle Grooming Hub  
**System Type:** Offline-First Distributed Event-Sourced POS/Queue  
**Foundational Authority:** TAS v1.0, PRD v1.0, ECS v1.2  
**Purpose:** This document defines the canonical domain events, state transition logic, and authority boundaries governing the system. Version 1.3 extends the contract to support remote reservations, mutable service intents, and deterministic schedule management.

---

### 1. Aggregate Model & Responsibilities

| Aggregate           | Responsibility                                                                                      |
| :------------------ | :-------------------------------------------------------------------------------------------------- |
| **CustomerProfile** | Governance of identity lifecycle, PII, and verified account status.                                 |
| **QueueEntry**      | **Logistics Layer:** Management of arrival sequence, waiting state, and reservation lifecycle.      |
| **BarberLane**      | Control of barber availability, recurring schedule rules, and service execution.                    |
| **Transaction**     | **Commerce Layer:** Itemized financial accounting, revenue/tip partitioning, and settlement status. |
| **TerminalSession** | Cryptographic linkage of physical operators to the event stream.                                    |
| **SystemProcess**   | Observability for sync health, recovery, and global shop hours configuration.                       |

---

### 2. Domain Principles & Invariants

#### **2.1 Append-Only Invariant**

The Event Journal SHALL be immutable. No event defined in this specification SHALL support update or delete operations. Corrections MUST be implemented via `EVENT 09 — ADJUSTMENT_EVENT`.

#### **2.2 Total Ordering**

All events MUST include a Hybrid Logical Clock (HLC) timestamp. The system SHALL use the HLC to ensure deterministic convergence across distributed terminals.

#### **2.3 Aggregate Concurrency**

Every event MUST include an `aggregate_version`. The system MUST reject any event where `incoming_version != current_version + 1` for the specific `aggregate_id`.

#### **2.4 Authority Boundaries (Updated)**

| Authority            | Emitter              | Controlled Events                      |
| :------------------- | :------------------- | :------------------------------------- |
| **Local Authority**  | Local Terminal       | 01–07, 09, 10, 12, 13–14, 17–18, 20–24 |
| **Cloud Authority**  | Cloud Canonical Tier | 08, 11, 15, 16, 19, 20–22              |
| **System Authority** | Deterministic Logic  | 25                                     |

**Dual Authority Rule:** For events with dual authority (20–22), Authority Rank applies first (Cloud for remote intent initiation, Local for active session operations), then HLC as tie-breaker within the same rank.

#### **2.5 Customer Preference Sovereignty**

The system SHALL NOT automatically reorder the queue. Reassignment of a customer to a non-preferred barber MUST be preceded by `EVENT 12 — QUEUE_TRANSFER_CONSENTED`.

#### **2.6 Service Intent Lifecycle**

Service intents (Events 21–22) are transient logistical attributes of the `QueueEntry` aggregate. Upon emission of `EVENT 04 — SERVICE_ENGAGED`, the active intent list is snapshotted into the `Transaction` aggregate, transitioning data from the Logistics Layer to the Commerce Layer. Post-engagement changes MUST route through `EVENT 09`.

---

### 3. Canonical Event Catalog

#### **3.1 Domain Events (Operational & Financial)**

**EVENT 01 — CUSTOMER_CHECKED_IN (Updated)**

- **Emitter:** Local Terminal (Cashier)
- **Preconditions:** `customer_uuid` NOT active in global queue.
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {customer_uuid, preferred_barber_id, checkin_method, reservation_id?}`
- **State Effect:** If `reservation_id` is null: initializes `QueueEntry` → `WAITING`. If `reservation_id` exists: transitions existing aggregate from `RESERVED` → `WAITING`.

**EVENT 19 — APPOINTMENT_RESERVED**

- **Emitter:** **Cloud Canonical Tier ONLY**
- **Preconditions:** Requested slot must be "Available" per pure materialized view of current journal state.
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {customer_uuid, preferred_barber_id, requested_start_hlc}`
- **State Effect:** Initializes `QueueEntry` → `RESERVED`.

**EVENT 20 — RESERVATION_CANCELLED**

- **Emitter:** Cloud Tier or Local Terminal
- **Preconditions:** Associated Transaction aggregate does NOT contain EVENT 04.
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {reason_code}`
- **State Effect:** `QueueEntry` → `CANCELLED`. Releases projected lane occupancy.

**EVENT 21 — SERVICE_INTENT_ADDED**

- **Emitter:** Cloud Tier or Local Terminal
- **Preconditions:** `QueueEntry` is `RESERVED` or `WAITING`. `EVENT 04` has NOT occurred.
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {service_id}`
- **State Effect:** Appends `service_id` to logistical intent list. Invariant: Durations are NOT stored.

**EVENT 22 — SERVICE_INTENT_REMOVED**

- **Emitter:** Cloud Tier or Local Terminal
- **Preconditions:** `QueueEntry` is `RESERVED` or `WAITING`. `EVENT 04` has NOT occurred.
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {service_id}`
- **State Effect:** Removes `service_id` from logistical intent list.

**EVENT 23 — BARBER_SCHEDULE_UPDATED**

- **Emitter:** Local Terminal (Barber/Admin)
- **Aggregate:** `BarberLane`
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {day_of_week, start_time, end_time, is_active}`
- **State Effect:** Updates recurring availability rules for the barber.

**EVENT 24 — SHOP_HOURS_CHANGED**

- **Emitter:** Local Terminal (Admin)
- **Aggregate:** `SystemProcess`
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id, actor_id, version, signature}`
  - `domain: {date_scope, open_time, close_time, is_closed}`
- **State Effect:** Updates recurring default or one-time overrides for shop hours.

**EVENT 25 — RESERVATION_EXPIRED**

- **Emitter:** **System Actor (Deterministic)**
- **Deterministic Emitter Rule:** Only the terminal whose `terminal_id` produces the lowest `hash(aggregate_id + terminal_id)` emits `EVENT 25` locally. Duplicates are ignored via `aggregate_version` and idempotency.
- **Trigger:** `Current_Local_HLC > (requested_start_hlc + grace_window_from_journal)`.
- **Preconditions:** `QueueEntry` is `RESERVED`. No `EVENT 01` linked.
- **Payload:**
  - `event_id`, `aggregate_id`, `aggregate_version`, `type`, `metadata: {hlc_timestamp, terminal_id: "SYSTEM", actor_id: "SYSTEM", version, signature: "AUTO"}`
- **State Effect:** `QueueEntry` → `EXPIRED`.

---

### 4. Action Matrix (Updated)

| Actor            | Capability Module | User Action           | Emits Event | Constraints              |
| :--------------- | :---------------- | :-------------------- | :---------- | :----------------------- |
| Customer         | Remote App        | Reserve Appointment   | EVENT 19    | Cloud Authority          |
| Customer/Cashier | Remote App/Intake | Cancel Appointment    | EVENT 20    | Dual Authority           |
| Customer/Cashier | App / Intake      | Add Service Intent    | EVENT 21    | Forbidden after EVENT 04 |
| Customer/Cashier | App / Intake      | Remove Service Intent | EVENT 22    | Forbidden after EVENT 04 |
| Barber           | Lane Cockpit      | Set Recurring Hours   | EVENT 23    | Barber Sovereignty       |
| Admin            | Admin Governance  | Shop Hour Override    | EVENT 24    | Role: Admin              |
| System           | SystemProcess     | Deterministic Expiry  | EVENT 25    | Local Deterministic      |

---

### 5. Convergence & Projection Rules

#### **5.5 Duration & Wait-Time Projection Rules**

1.  **Service Duration:** Duration for a `service_id` is projected by taking the arithmetic mean of the HLC delta between `EVENT 05` and `EVENT 04` for the last 50 transactions.
2.  **Lane Wait Time:** Calculated as the sum of projected durations for all `ENGAGED` or `WAITING` entries in a specific `BarberLane`.
3.  **Availability Projection:** A slot is "Available" if `(Start + Duration) < Close` (EVENT 24), Barber is `active` (EVENT 23), and no overlaps exist.
4.  **Invariance:** Projection algorithms SHALL NOT influence event validity or state transitions.

#### **5.6 Offline Convergence Guarantees**

- **Expiry (Event 25):** Deterministic evaluation across terminals ensures identical triggers. Hash-based emission restricts the journal to one valid entry per expiry event.
- **Schedule Collisions:** Offline collisions between `EVENT 23` and `EVENT 19` trigger `EVENT 16 — RECONCILIATION_ANOMALY_DETECTED` on sync for Admin resolution.

---

### 6. Technical Schema Extensions (LocalJournalSchemas)

**Aggregate: QueueEntry / Transaction (Payload Additions)**

- `reservation_id`: UUID (Optional)
- `intents`: Array<ServiceID> (Logistics layer)

**Aggregate: BarberLane (Payload Additions)**

- `schedule_rules`: Array<{ day_of_week, start, end, active }>

**Aggregate: SystemProcess (Payload Additions)**

- `operating_hours`: Map<DateScope, { open, close, closed }>
- `grace_window_minutes`: Integer (Default: 15)

---

### 7. AMS v1.3 / IMS v1.1 Alignment Notes

**AMS v1.3 Capabilities:**

- **Remote Scheduling:** Cloud-authority module for `EVENT 19`.
- **Intent Management:** Capability in Concierge/Client App for `21/22`.
- **Schedule Governance:** Barber recurring availability (23) and Admin shop overrides (24).

**IMS v1.1 Projections:**

- **Real-time Calendar:** Reactive view based on projected lane durations.
- **Expiry Feedback:** Visual status board signal for nearing grace threshold.
- **Intent Lock:** Transition to "Read Only" once the journal contains `EVENT 04`.
