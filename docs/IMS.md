# Interface Module Specification (IMS v1.1)

**Project:** Uncle Grooming Hub  
**System Foundation:** PRD v1.0, TAS v1.1, ECS v1.3, AMS v1.3  
**Interface Philosophy:** Deterministic Projection Consumption

---

## 1. Interface Architecture Overview

The interfaces defined in this specification SHALL function as **Reactive Event Projections**. No interface component SHALL possess independent state or logic that is not derived from the HLC-ordered Event Journal.

1. **Read Model:** Interfaces SHALL render state exclusively from materialized projections constructed by deterministic projection services derived from the HLC-ordered Event Journal. Replay responsibility belongs to the Projection Layer.
2. **Write Model:** User interactions SHALL resolve exclusively to the emission of a single ECS event.
3. **Logistics vs. Commerce Separation:** Interfaces MUST distinguish between logistical attributes (QueueEntry intents) and finalized commercial snapshots (Transaction snapshots created at Event 04).
4. **Latency Compensation:** UIs SHALL provide immediate optimistic feedback upon local journal commitment but MUST clearly distinguish between `Local Authority` and `Cloud Authority` verified states.

---

## 2. Interface Module Map

| Module                   | Screen             | Type       | Actor          | Emits Events           | Consumes Events (Projections) |
| :----------------------- | :----------------- | :--------- | :------------- | :--------------------- | :---------------------------- |
| Terminal Operations      | Operator Login     | Emits 13   |
| Terminal Operations      | System Actor       | Emits 25\* | 17, 18         |
| **Remote Scheduler**     | Client App         | Capability | Customer       | 19, 20, 21, 22         | 23, 24                        |
| **Concierge & Check-in** | Client Intake      | Capability | Cashier        | 01, 10, 20, 21, 22     | 11, 19                        |
| **Concierge & Check-in** | Queue Manager      | Capability | Cashier, Admin | 03, 12                 | 01, 04, 05, 19, 25            |
| **Lane Cockpit**         | Barber Dashboard   | Capability | Barber         | 02, 04, 05, 21, 22, 23 | 03                            |
| **Settlement Desk**      | Payment Terminal   | Capability | Cashier        | 06                     | 05, 07, 08                    |
| **Public Status Board**  | Status Board       | Projection | System         | None                   | 01, 03, 04, 05, 19, 25        |
| **Admin Governance**     | Audit & Correction | Capability | Admin          | 09, 24                 | All                           |
| **Terminal Operations**  | System Status      | Projection | Admin          | 14                     | 15, 16, 17, 18, 25            |

_\*Event 25 emission is restricted to eligible terminals per hash-based deterministic selection (ECS §5.6)._

---

## 3. Screen Specifications

### Operator Login

**Module:** Terminal Operations  
**Actor:** All Operators  
**Screen Type:** Boundary  
**Purpose:** Cryptographic gatekeeper for terminal access.  
**Derived From Aggregates:** TerminalSession  
**Visible State:** Terminal Authorization status, Recovery progress.  
**User Actions → Event Emissions:**

| User Action  | Preconditions             | Emits ECS Event                           | Authority | Result                |
| ------------ | ------------------------- | ----------------------------------------- | --------- | --------------------- |
| Confirm Cash | Physical Receipt Verified | Settlement Request → Cloud emits EVENT 08 | Cloud     | Transaction → SETTLED |

---

### Client App

**Module:** Remote Scheduler  
**Actor:** Customer  
**Screen Type:** Capability  
**Purpose:** Internet-based intent initiation and slot reservation.  
**Derived From Aggregates:** QueueEntry  
**Visible State:** Projected availability slots (Materialized View of 23, 24, and active lane wait-times).  
**User Actions → Event Emissions:**

| User Action    | Preconditions               | Emits ECS Event | Authority | Resulting State Change         |
| :------------- | :-------------------------- | :-------------- | :-------- | :----------------------------- |
| Reserve Slot   | Slot projected as AVAILABLE | EVENT 19        | Cloud     | QueueEntry → RESERVED          |
| Add Intent     | QueueEntry is RESERVED      | EVENT 21        | Cloud     | Logistical intent list updated |
| Cancel Booking | QueueEntry is RESERVED      | EVENT 20        | Cloud     | QueueEntry → CANCELLED         |

---

### Client Intake

**Module:** Concierge & Check-in  
**Actor:** Cashier  
**Screen Type:** Capability  
**Purpose:** Entry point for physical arrivals and reservation reconciliation.  
**Derived From Aggregates:** CustomerProfile, QueueEntry  
**Visible State:** Matching Shadow Profiles, Active Reservations (Event 19).  
**User Actions → Event Emissions:**

| User Action              | Preconditions                                                  | Emits ECS Event | Authority | Resulting State Change         |
| :----------------------- | :------------------------------------------------------------- | :-------------- | :-------- | :----------------------------- |
| Confirm Arrival          | UUID not active in queue                                       | EVENT 01        | Local     | QueueEntry → WAITING           |
| Confirm Reserved Arrival | reservation_id valid                                           | EVENT 01        | Local     | RESERVED → WAITING             |
| Update Intent            | The associated Transaction aggregate does NOT contain EVENT 04 | EVENT 21/22     | Local     | Logistical intent list updated |
| Cancel Reservation       | QueueEntry is RESERVED                                         | EVENT 20        | Local     | QueueEntry → CANCELLED         |

---

### Queue Manager

**Module:** Concierge & Check-in  
**Actor:** Cashier, Admin  
**Screen Type:** Capability  
**Purpose:** Operational control of the arrival-to-chair transition.  
**Derived From Aggregates:** QueueEntry, BarberLane  
**Visible State:** Waiting list (ordered by HLC), Reservations, Expiry countdowns (per Event 25 rules).  
**User Actions → Event Emissions:**

| User Action         | Preconditions                 | Emits ECS Event | Authority | Resulting State Change   |
| :------------------ | :---------------------------- | :-------------- | :-------- | :----------------------- |
| Assign to Preferred | Barber AVAILABLE == Preferred | EVENT 03        | Local     | customer → CALLED        |
| Transfer Preference | Client consent flag TRUE      | EVENT 12        | Local     | Preferred Barber updated |

---

### Barber Dashboard

**Module:** Lane Cockpit  
**Actor:** Barber  
**Screen Type:** Capability  
**Purpose:** Sovereign lane control and schedule management.  
**Derived From Aggregates:** BarberLane, Transaction, QueueEntry  
**Visible State:** Active CALLED client, Personal Lane Status, Recurring Schedule.  
**User Actions → Event Emissions:**

| User Action              | Preconditions                                                  | Emits ECS Event | Authority | Resulting State Change         |
| :----------------------- | :------------------------------------------------------------- | :-------------- | :-------- | :----------------------------- |
| Start Service            | Lane CALLED                                                    | EVENT 04        | Local     | Transaction snapshot created   |
| Update Recurring Pattern | BARBER role active                                             | EVENT 23        | Local     | Schedule rules updated         |
| Adjust Lane Intent       | The associated Transaction aggregate does NOT contain EVENT 04 | EVENT 21/22     | Local     | Logistical intent list updated |

---

### Payment Terminal

**Module:** Settlement Desk  
**Actor:** Cashier  
**Screen Type:** Capability  
**Purpose:** Facilitation of financial intent and settlement requests.  
**Derived From Aggregates:** Transaction  
**Visible State:** Locked transaction intents (snapshotted at Event 04).  
**User Actions → Event Emissions:**

| User Action        | Preconditions             | Emits ECS Event    | Authority | Resulting State Change                            |
| :----------------- | :------------------------ | :----------------- | :-------- | :------------------------------------------------ |
| Initialize Billing | Transaction COMPLETED     | EVENT 06           | Local     | Intent Locked; QR generated                       |
| Confirm Cash       | Physical Receipt Verified | EVENT 08 (Request) | **Cloud** | Requests Cloud-authoritative emission of EVENT 08 |

---

### Audit & Correction

**Module:** Admin Governance  
**Actor:** Admin  
**Screen Type:** Capability  
**Purpose:** Itemized correction and shop-wide configuration overrides.  
**Derived From Aggregates:** All Aggregates, SystemProcess  
**Visible State:** HLC-ordered Event Stream, Global Hours.  
**User Actions → Event Emissions:**

| User Action         | Preconditions                | Emits ECS Event | Authority | Resulting State Change        |
| :------------------ | :--------------------------- | :-------------- | :-------- | :---------------------------- |
| Append Adjustment   | Valid Transaction Ref exists | EVENT 09        | Local     | Ledger corrected via reversal |
| Override Shop Hours | ADMIN role active            | EVENT 24        | Local     | Operating hours rules updated |

---

## 4. Navigation State Machine

1. **Root State:** Operator Login.
2. **External Entry:** Client App (RESERVED state).
3. **Transition (Event 13):** Access granted to Role-specific Dashboard derived from materialized projections.
4. **Operational states:**
   - `RESERVED` (QueueEntry) → Visible in Intake/Remote App.
   - `WAITING` (QueueEntry) → Visible in Queue Manager.
   - `CALLED` (BarberLane) → Visible in Barber Dashboard.
   - `PAYMENT_PENDING` (Transaction) → Visible in Settlement Desk.
5. **Terminal state:** `SETTLED` (Transaction) → Record archived; UI clears.

---

## 5. Interface Invariants

- **Idempotent UI:** Interfaces SHALL enforce idempotency through aggregate version validation and deterministic client-generated event_uuid values. Duplicate submissions MUST be rejected by version conflict detection.
- **Projection Integrity:** Durations and wait times SHALL NOT be stored in interfaces. They MUST be projected on-the-fly using historical mean durations from the journal.
- **Clock Sovereignty:** The UI SHALL NOT display system wall-clock time for operational sequence; only HLC position is used for ordering.
- **Deterministic Expiry:** Status updates for no-shows MUST rely on the emission of Event 25 by the selected terminal, preventing UI flickering or duplicate calls.
- **Queue Preference Sovereignty:** Queue ordering MUST preserve customer barber preference. Queue reordering SHALL NOT occur automatically. Cashiers MUST NOT override customer preference. Reassignment MAY occur ONLY when customer consent is confirmed AND barber agreement exists AND the transition moves the customer into an idle barber lane.

---

## 6. Compliance Verification Matrix

| Architectural Rule            | Enforced By Interface Mechanism                                                                 |
| :---------------------------- | :---------------------------------------------------------------------------------------------- |
| **Append-Only**               | Absence of UPDATE/DELETE UI controllers; all corrections via Adjustment input.                  |
| **Financial Finality**        | Settlement Desk restricted to REQUEST/PROJECTION for digital payments.                          |
| **Intent Lock**               | Concierge and Lane Cockpit disable 21/22 controls once Event 04 is replayed.                    |
| **Preference Sovereignty**    | Call button disabled for non-preferred barbers until Event 12 commit.                           |
| **Deterministic Convergence** | All screens build state from materialized projections constructed from the HLC-ordered Journal. |
| **Schedule Authority**        | Only ADMIN role can access Shop Hour Override (Event 24).                                       |
