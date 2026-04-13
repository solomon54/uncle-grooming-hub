# Event Contract Specification (ECS) v1.2

**Project:** Uncle Grooming Hub  
**System Type:** Offline-First Distributed Event-Sourced POS/Queue  
**Foundational Authority:** TAS v1.1, PRD v1.0  
**Purpose:** This document defines the canonical domain events, state transition logic, and authority boundaries governing the system. All state changes MUST resolve to an event defined herein.

---

### 1. Aggregate Model & Responsibilities

| Aggregate           | Responsibility                                                                  |
| :------------------ | :------------------------------------------------------------------------------ |
| **CustomerProfile** | Governance of identity lifecycle, PII, and verified account status.             |
| **QueueEntry**      | Management of arrival sequence, waiting state, and barber preference.           |
| **BarberLane**      | Control of barber availability and immediate service lifecycle.                 |
| **Transaction**     | Itemized financial accounting, revenue/tip partitioning, and settlement status. |
| **TerminalSession** | Cryptographic linkage of physical operators to the event stream.                |
| **SystemProcess**   | Observability for synchronization health, recovery, and snapshots.              |

---

### 2. Domain Principles & Invariants

#### **2.1 Append-Only Invariant**

The Event Journal SHALL be immutable. No event defined in this specification SHALL support update or delete operations. Corrections MUST be implemented via `EVENT 09 — ADJUSTMENT_EVENT` or compensating events.

#### **2.2 Total Ordering**

All events MUST include a Hybrid Logical Clock (HLC) timestamp. The system SHALL use the HLC to ensure deterministic convergence across distributed terminals.

#### **2.3 Aggregate Concurrency**

Every event MUST include an `aggregate_version`. The system MUST reject any event where `incoming_version != current_version + 1` for the specific `aggregate_id`.

#### **2.4 Authority Boundaries**

- **Local Authority:** Local terminals are the sole emitters for operational lifecycle events (01–07, 10, 12, 13–14, 17–18). EVENT 07 SHALL NOT modify Transaction finality or ledger balances.
- **Cloud Authority:** The Cloud Canonical Tier is the sole authority for financial finality and global identity reconciliation (08, 11, 15, 16).

#### **2.5 Customer Preference Sovereignty**

The system SHALL NOT automatically reorder the queue. Reassignment of a customer to a non-preferred barber MUST be preceded by `EVENT 12 — QUEUE_TRANSFER_CONSENTED`.

---

### 3. Canonical Event Catalog

#### **3.1 Domain Events (Operational & Financial)**

##### **EVENT 01 — CUSTOMER_CHECKED_IN**

- **Emitter:** Local Terminal (Cashier)
- **Preconditions:** `customer_uuid` MUST NOT be active in the global queue.
- **Payload:** `customer_uuid`, `preferred_barber_id`, `checkin_method`.
- **Invariants:** Locks the initial FIFO arrival position.

##### **EVENT 02 — BARBER_AVAILABLE**

- **Emitter:** Local Terminal (Barber)
- **Preconditions:** Barber MUST NOT be in `ENGAGED` state.
- **State Effect:** Transitions lane status to `AVAILABLE`.

##### **EVENT 03 — CUSTOMER_CALLED_TO_CHAIR**

- **Emitter:** Local Terminal (Cashier/Admin)
- **Preconditions:** `QueueEntry` status is `WAITING`; `BarberLane` status is `AVAILABLE`.
- **Invariants:** `barber_id` MUST match `preferred_barber_id` unless an Event 12 exists for this session.

##### **EVENT 04 — SERVICE_ENGAGED**

- **Emitter:** Local Terminal (Barber)
- **Preconditions:** Aggregate status MUST be `CALLED`.
- **State Effect:** Initializes the `Transaction` aggregate; locks the service price registry snapshot.

##### **EVENT 05 — SERVICE_COMPLETED**

- **Emitter:** Local Terminal (Barber)
- **Preconditions:** Aggregate status MUST be `IN_SERVICE`.
- **State Effect:** Releases `BarberLane` to `AVAILABLE`. Sets `Transaction` to `PAYMENT_PENDING`.

##### **EVENT 06 — PAYMENT_INTENT_CREATED**

- **Emitter:** Local Terminal (Cashier)
- **Payload:** `base_price`, `tip_amount`, `payment_method`.
- **Invariants:** Itemized values MUST be locked. `Total_Paid` MUST equal `base_price + tip_amount`.

##### **EVENT 07 — PAYMENT_PROCESSING**

- **Emitter:** Local Terminal (System)
- **Purpose:** Transient state for digital gateway handshakes; provides local visibility during webhook lag.

##### **EVENT 08 — PAYMENT_SETTLED**

- **Emitter:** **Cloud Canonical Tier ONLY**
- **Authority:** Exclusive authority to finalize the ledger.
- **Trigger:** Verified gateway webhook OR Admin-verified cash receipt.
- **State Effect:** Virtual wallets updated; Recognition Units awarded.

##### **EVENT 09 — ADJUSTMENT_EVENT**

- **Emitter:** Local Terminal (Admin)
- **Preconditions:** Reference to `original_transaction_uuid` MUST be valid.
- **State Effect:** Appends compensating financial data without modifying the original record.

##### **EVENT 10 — ACCOUNT_VERIFIED**

- **Emitter:** Local Terminal (Cashier)
- **Trigger:** OTP verification success.
- **State Effect:** Upgrades `shadow_profile` status to `verified_account`.

##### **EVENT 11 — IDENTITY_MERGED**

- **Emitter:** **Cloud Canonical Tier ONLY**
- **Purpose:** Resolves duplicate Shadow Profiles created during offline multi-terminal operations.

##### **EVENT 12 — QUEUE_TRANSFER_CONSENTED**

- **Emitter:** Local Terminal (Cashier)
- **Preconditions:** `customer_consent == TRUE`.
- **Purpose:** Mandatory bypass for Customer Preference Sovereignty.

---

#### **3.2 Infrastructure & System Events**

**EVENT 13 — OPERATOR_SESSION_OPENED**

- **Emitter:** Local Terminal (Boundary Module)
- **Requirement:** Mandatory cryptographic actor attribution for all subsequent events in the session.

**EVENT 14 — OPERATOR_SESSION_CLOSED**

- **Emitter:** Local Terminal (Boundary Module)
- **Requirement:** Termination of actor authority on the specific terminal.

**EVENT 15 — SYNC_BATCH_ACKNOWLEDGED**

- **Emitter:** Cloud Canonical Tier
- **Purpose:** Signals successful commitment to cloud ledger; enables local journal pruning.

**EVENT 16 — RECONCILIATION_ANOMALY_DETECTED**

- **Emitter:** Cloud Canonical Tier
- **Purpose:** Quarantines aggregates for manual review if HLC or version conflicts violate business logic.

**EVENT 17 — LOCAL_SNAPSHOT_COMMITTED**

- **Emitter:** Local Terminal (System)
- **Purpose:** Establishes a baseline for rapid state reconstitution during boot.

**EVENT 18 — TERMINAL_RECOVERY_COMPLETED**

- **Emitter:** Local Terminal (System)
- **Purpose:** Observability event documenting the duration and event count of the replay cycle.

---

### 4. Action Matrix

The Action Matrix maps human-triggered operations to deterministic event emission.

| Actor         | Capability Module    | User Action         | Emits Event | Constraints                  |
| :------------ | :------------------- | :------------------ | :---------- | :--------------------------- |
| Cashier       | Concierge & Check-in | Check In Customer   | EVENT 01    | Active Session Required      |
| Barber        | Lane Cockpit         | Toggle Availability | EVENT 02    | Active Session Required      |
| Cashier/Admin | Concierge & Check-in | Call Customer       | EVENT 03    | Preferred Barber Invariant   |
| Barber        | Lane Cockpit         | Engage Service      | EVENT 04    | CALLED state required        |
| Barber        | Lane Cockpit         | Complete Service    | EVENT 05    | IN_SERVICE state required    |
| Cashier       | Settlement Desk      | Initialize Billing  | EVENT 06    | COMPLETED state required     |
| Admin         | Admin Governance     | Correction Entry    | EVENT 09    | Reference UUID Required      |
| Cashier       | Concierge & Check-in | Verify Account      | EVENT 10    | OTP Verification Required    |
| Cashier       | Concierge & Check-in | Transfer Preference | EVENT 12    | Explicit Consent Flag        |
| Cashier       | Settlement Desk      | Confirm Cash        | EVENT 08    | **Cloud Mediation Required** |
| Operator      | Terminal Operations  | Login               | EVENT 13    | Credential Hash Match        |
| Operator      | Terminal Operations  | Logout              | EVENT 14    | Active Session Required      |

---

### 5. Deterministic Convergence Rules

**5.1 Idempotency Guarantee**  
All events SHALL be keyed by a unique `event_uuid`. Duplicate arrivals at the Cloud Tier SHALL be acknowledged with `200 OK` but SHALL NOT trigger state effects.

**5.2 Replay Consistency**  
State reconstitution MUST result in a state identical to the pre-failure state when replaying events from the last verified `LOCAL_SNAPSHOT_COMMITTED` (Event 17).

**5.3 Conflict Resolution**  
In the event of a total ordering conflict, the event with the **lowest HLC** SHALL prevail. Losing events SHALL be quarantined via `EVENT 16 — RECONCILIATION_ANOMALY_DETECTED`.

**5.4 Event Immutability Guarantee**
Events once emitted SHALL NEVER be re-written, re-ordered,
or removed from the journal by any subsystem including Cloud Authority.
