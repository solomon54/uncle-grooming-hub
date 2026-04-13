# Application Module Specification (AMS v1.3 )

**Project:** Uncle Grooming Hub  
**System Foundation:** PRD v1.0, TAS v1.1, ECS v1.3  
**Design Philosophy:** Cinema Dark / High-Contrast / Deterministic / Remote Convergence

---

### 1. Module Map Overview

| Module Name              | Module Type | Responsible Actor(s) | Governing Aggregates                                    | Related ECS Events              |
| :----------------------- | :---------- | :------------------- | :------------------------------------------------------ | :------------------------------ |
| **Remote Scheduler**     | Capability  | Customer (Cloud)     | QueueEntry, Transaction (Draft)                         | 19, 20, 21, 22                  |
| **Concierge & Check-in** | Capability  | Cashier, Admin       | QueueEntry, CustomerProfile, BarberLane                 | 01, 03, 10, 12, 20, 21, 22      |
| **Lane Cockpit**         | Capability  | Barber               | BarberLane, Transaction                                 | 02, 04, 05, 21, 22, 23          |
| **Settlement Desk**      | Capability  | Cashier              | Transaction                                             | 06, 07                          |
| **Public Status Board**  | Projection  | (System)             | QueueEntry, BarberLane                                  | (Views: 01, 03, 04, 05, 19, 25) |
| **Admin Governance**     | Capability  | Admin                | Transaction, QueueEntry, CustomerProfile, SystemProcess | 09, 24                          |
| **Terminal Operations**  | Boundary    | Operator, System     | TerminalSession, SystemProcess                          | 13, 14, 15, 17, 18, 25          |

---

### 2. Module Definitions

#### **Remote Scheduler (Capability Module)**

**Purpose:** Facilitate internet-based intent initiation and service reservations.  
**Actors:** Customer (Cloud Tier)  
**Capabilities:**

- **Appointment Reservation:** Triggered by Customer; emits Event 19. Precondition: Slot projected as "Available" by Cloud Read-Model. State: `QueueEntry → RESERVED`.
- **Remote Intent Management:** Triggered by Customer; emits Events 21/22. Precondition: `QueueEntry` is `RESERVED`.
- **Remote Cancellation:** Triggered by Customer; emits Event 20. Precondition: `QueueEntry` is `RESERVED`. State: `QueueEntry → CANCELLED`.

#### **Concierge & Check-in (Capability Module)**

**Purpose:** Manage physical client arrival, identity governance, and manual queue-to-chair transitions.  
**Actors:** Cashier, Admin  
**Capabilities:**

- **Customer Entry:** Triggered by Cashier; commits Event 01. Precondition: UUID not active in queue. State: `QueueEntry → WAITING`.
- **Reserved Arrival:** Triggered by Cashier; commits Event 01 with `reservation_id`. Precondition: Existing `RESERVED` aggregate. State: `RESERVED → WAITING`.
- **On-Site Intent Management:** Triggered by Cashier; commits Event 21/22. Precondition: `QueueEntry` is `WAITING`.
- **Call to Chair:** Triggered by Cashier/Admin; commits Event 03. Precondition: `QueueEntry` is `WAITING`, `BarberLane` is `AVAILABLE`.
- **Preference Management:** Triggered by Cashier; commits Event 12. Precondition: Customer consent confirmed.
- **Account Promotion:** Triggered by Cashier; commits Event 10. Precondition: `Shadow Profile` exists, OTP validation successful.

**Forbidden Actions:**

- Automatic barber reassignment (Violates TAS §13).
- Emission of EVENT 21/22 SHALL be rejected once the associated Transaction aggregate contains EVENT 04.

#### **Lane Cockpit (Capability Module)**

**Purpose:** Barber-sovereign workspace for availability control, recurring schedule management, and service execution.  
**Actors:** Barber  
**Capabilities:**

- **Status Toggle:** Triggered by Barber; commits Event 02. Precondition: Active `TerminalSession`.
- **Schedule Definition:** Triggered by Barber; commits Event 23. Precondition: BARBER role. State: Updates `BarberLane` recurring availability rules.
- **Engagement-Phase Intent Adjustment:** Triggered by Barber; commits Event 21/22. Precondition: Status is `CALLED` (Immediate pre-engagement).
- **Service Engagement:** Triggered by Barber; commits Event 04. Precondition: `BarberLane` status is `CALLED`.
- **Service Finalization:** Triggered by Barber; commits Event 05. Precondition: `BarberLane` status is `IN_SERVICE`.

**Forbidden Actions:**

- Emission of EVENT 21/22 SHALL be rejected once the associated Transaction aggregate contains EVENT 04 (Lanes MUST use Event 09 for post-engagement changes).
- Service engagement prior to `CALLED` state derivation.

#### **Settlement Desk (Capability Module)**

**Purpose:** Facilitates itemized financial intent and requests Cloud-authoritative settlement.  
**Actors:** Cashier  
**Capabilities:**

- **Intent Initialization:** Triggered by Cashier; commits Event 06. Precondition: `Transaction` state is `PAYMENT_PENDING`.
- **Settlement Finalization Request:** Triggered by Cashier; requests Cloud-authoritative emission of Event 08. Precondition: Physical cash verified or digital webhook confirmed.

**Forbidden Actions:**

- Direct local emission of Event 08 (Cloud Authority Only).
- Modification of itemized billing values after Event 06 intent is locked.

#### **Public Status Board (Projection Module)**

**Purpose:** Passive, read-only projection of the shop-wide operational state including incoming reservations.  
**Actors:** (System Display)  
**Capabilities:**

- **Ambient Display:** Provides a strictly event-derived view of `QueueEntry` sequence (RESERVED/WAITING) and `BarberLane` occupancy.

#### **Admin Governance (Capability Module)**

**Purpose:** Governance of immutable financial records, global system reconciliation, and operational hours control.  
**Actors:** Admin  
**Capabilities:**

- **Correction Entry:** Triggered by Admin; commits Event 09. Precondition: Verified reference to an original `transaction_uuid`.
- **Operational Hours Override:** Triggered by Admin; commits Event 24. State: Updates `SystemProcess` default or date-specific rules.
- **Reconciliation Monitoring:** Projection of Cloud-Authority Events 11 and 16.

#### **Terminal Operations (Boundary Module)**

**Purpose:** System Gatekeeper and Session Boundary enforcing actor attribution and observing deterministic system triggers.  
**Actors:** Operator (All), System Actor  
**Capabilities:**

- **Session Initialization:** Triggered by Operator; commits Event 13.
- **System Integrity Monitoring:** Projection of Events 15, 17, 18.
- **Expiry Observation:** Projection of Event 25 (Deterministic No-Show Trigger). Eligible terminals MAY emit EVENT 25 according to deterministic emitter selection rules defined in ECS §5.6.

---

### 3. Navigation Topology

1.  **Unified Entry:** `Terminal Operations` gates all local modules. `Remote Scheduler` provides a decoupled internet entry point.
2.  **Convergence Flow:**
    - `Remote Scheduler` (Cloud) → `RESERVED` state.
    - `RESERVED` (Remote) + `Concierge` (Local) → `WAITING` state.
    - `Concierge` (Local) → `CALLED` state.
    - `Lane Cockpit` (Local) → `ENGAGED` → `COMPLETED` states.
    - `Settlement Desk` (Local) → `SETTLED` state.
3.  **Governance & Visibility:** `Admin Governance` and `Public Status Board` project state from the journal across all lifecycle stages.

---

### 4. Architectural Compliance Check

- **Authority Boundary Compliance:** Modules strictly separate Local Authority from Cloud Authority. `Remote Scheduler` is the only module capable of triggering Event 19.
- **Materialized Projection Invariant:** No module SHALL store durations or wait-times. All modules MUST calculate these values on-the-fly by replaying the HLC-ordered Event Journal.
- **Intent Lock Constraint:** Emission of EVENT 21/22 SHALL be rejected once the associated Transaction aggregate contains EVENT 04.
- **Deterministic Expiry:** `Terminal Operations` monitors the `RESERVATION_EXPIRED` (25) trigger, ensuring that local UI state converges with the deterministic system logic without human intervention.
- **Append-Only Enforcement:** All state changes within any module resolve to a `commitEvent()` operation. No "Edit" or "Overwrite" logic is present in any capability module.
