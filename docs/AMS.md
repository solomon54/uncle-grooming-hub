# Application Module Specification (AMS v1.2 — ECS Aligned)

**Project:** Uncle Grooming Hub  
**System Foundation:** PRD v1.0, TAS v1.1, ECS v1.2  
**Design Philosophy:** Cinema Dark / High-Contrast / Deterministic

---

### 1. Module Map Overview

| Module Name              | Module Type | Responsible Actor(s) | Governing Aggregates                     | Related ECS Events      |
| :----------------------- | :---------- | :------------------- | :--------------------------------------- | :---------------------- |
| **Concierge & Check-in** | Capability  | Cashier, Admin       | QueueEntry, CustomerProfile, BarberLane  | 01, 03, 10, 12          |
| **Lane Cockpit**         | Capability  | Barber               | BarberLane, Transaction                  | 02, 04, 05              |
| **Settlement Desk**      | Capability  | Cashier              | Transaction                              | 06, 07                  |
| **Public Status Board**  | Projection  | (System)             | QueueEntry, BarberLane                   | (Views: 01, 03, 04, 05) |
| **Admin Governance**     | Capability  | Admin                | Transaction, QueueEntry, CustomerProfile | 09                      |
| **Terminal Operations**  | Boundary    | Operator, System     | TerminalSession, SystemProcess           | 13, 14, 15, 17, 18      |

---

### 2. Module Definitions

#### **Concierge & Check-in (Capability Module)**

**Purpose:** Primary operational entry point for customer identity governance and arrival sequence management.  
**Actors:** Cashier, Admin  
**Capabilities:**

- **Customer Entry:** Triggered by Cashier; commits Event 01 to the local event journal. Precondition: UUID not currently active in `QueueEntry`.
- **Call to Chair:** Triggered by Cashier/Admin; commits Event 03 to the local event journal. Precondition: `QueueEntry` status is `WAITING`, `BarberLane` is `AVAILABLE`.
- **Preference Management:** Triggered by Cashier; commits Event 12 to the local event journal. Precondition: Customer consent confirmed.
- **Account Promotion:** Triggered by Cashier; commits Event 10 to the local event journal. Precondition: `Shadow Profile` exists, OTP validation successful.

**Screens (Conceptual):**

- **Check-in Interface:** Cashier-facing; Facilitates Events 01 & 10.
- **Concierge Queue View:** Cashier-facing; Facilitates Events 03 & 12.

**Forbidden Actions:**

- Automatic barber reassignment (Violates TAS §13 / ECS §2.5).
- Calling a customer to a non-preferred barber lane without prior commit of Event 12 to the local event journal.

#### **Lane Cockpit (Capability Module)**

**Purpose:** Barber-sovereign workspace for availability control and service lifecycle execution.  
**Actors:** Barber  
**Capabilities:**

- **Status Toggle:** Triggered by Barber; commits Event 02 to the local event journal. Precondition: Active `TerminalSession`.
- **Service Engagement:** Triggered by Barber; commits Event 04 to the local event journal. Precondition: `BarberLane` status is `CALLED`.
- **Service Finalization:** Triggered by Barber; commits Event 05 to the local event journal. Precondition: `BarberLane` status is `IN_SERVICE`.

**Screens (Conceptual):**

- **Barber Dashboard:** Barber-facing; Facilitates Events 02, 04, 05.

**Forbidden Actions:**

- Manual invocation of "Call to Chair" (Reserved for Concierge module / Event 03).
- Service engagement prior to `CALLED` state derivation.

#### **Settlement Desk (Capability Module)**

**Purpose:** Facilitates itemized financial intent and requests Cloud-authoritative settlement.  
**Actors:** Cashier  
**Capabilities:**

- **Intent Initialization:** Triggered by Cashier; commits Event 06 to the local event journal. Precondition: `Transaction` state is `PAYMENT_PENDING`.
- **Digital Handshake Monitoring:** Projection of Event 07 (System-emitted).
- **Settlement Finalization Request:** Triggered by Cashier; requests Cloud-authoritative emission of Event 08. Precondition: Physical cash verified or digital webhook confirmed.

**Screens (Conceptual):**

- **Payment Terminal:** Cashier-facing; Facilitates Event 06 and Settlement Requests.
- **Transaction Monitor:** Cashier-facing; Projection of Events 07 and Cloud-emitted Event 08.

**Forbidden Actions:**

- Direct local emission of Event 08 (Cloud Authority Only per ECS §2.4).
- Modification of itemized billing values after Event 06 intent is locked.

#### **Public Status Board (Projection Module)**

**Purpose:** Passive, read-only projection of the shop-wide operational state.  
**Actors:** (System Display)  
**Capabilities:**

- **Ambient Display:** Provides a strictly event-derived view of `QueueEntry` arrival sequence and `BarberLane` occupancy.

**Screens (Conceptual):**

- **Status Board:** Passive Display; Visual projection of state derived from Events 01, 03, 04, 05.

**Forbidden Actions:**

- Any interactive state mutation or event emission.
- Display of PII or financial data (Violates TAS §13.1).

#### **Admin Governance (Capability Module)**

**Purpose:** Governance of immutable financial records and monitoring of global system reconciliation.  
**Actors:** Admin  
**Capabilities:**

- **Correction Entry:** Triggered by Admin; commits Event 09 to the local event journal. Precondition: Verified reference to an original `transaction_uuid`.
- **Reconciliation Monitoring:** Projection of Cloud-Authority Events 11 (Identity Merge) and 16 (Anomaly Detection).

**Screens (Conceptual):**

- **Governance Dashboard:** Admin-facing; Facilitates Event 09 and projects global states from Events 11 & 16.

**Forbidden Actions:**

- Direct manual trigger of Event 11 or 16 (Cloud Authority Only).
- "Update" or "Delete" actions on historical ledger entries.

#### **Terminal Operations (Boundary Module)**

**Purpose:** Mandatory session gatekeeper enforcing cryptographic actor attribution and observing system health.  
**Actors:** Operator (All), System Actor  
**Capabilities:**

- **Session Initialization:** Triggered by Operator; commits Event 13 to the local event journal. Precondition: Local credential hash verification.
- **Session Termination:** Triggered by Operator; commits Event 14 to the local event journal.
- **System Integrity Monitoring:** Projection of system events 15 (Sync ACK), 17 (Snapshot), and 18 (Recovery).

**Screens (Conceptual):**

- **Operator Login:** Shared terminal gateway; Facilitates Event 13.
- **System Status Terminal:** Admin-only view of sync/recovery telemetry.

**Forbidden Actions:**

- Emission of any domain event (01–12) without an active and verified `TerminalSession`.

---

### 3. Navigation Topology

1.  **Mandatory Boundary:** `Terminal Operations` serves as the root entry point. Role-based access is determined by the `actor_id` and `role` defined in Event 13.
2.  **Operational Cycle:**
    - `Concierge` initializes `QueueEntry` (01) and transitions to `CALLED` (03).
    - `Lane Cockpit` consumes the `CALLED` state to trigger `ENGAGED` (04) and `COMPLETED` (05).
    - `Settlement Desk` consumes the `COMPLETED` state to initialize intent (06) and await Cloud-authoritative settlement confirmation (Event 08).
3.  **Global Monitoring:** `Admin Governance` and `Public Status Board` operate as non-linear modules, projecting state from the event journal regardless of active service flows.

---

### 4. Architectural Compliance Check

- **Authority Boundary Compliance:** Modules strictly separate Local Authority (emissions) from Cloud Authority (requests/projections) as mandated by ECS §2.4.
- **Deterministic Convergence:** Module states are derived from the HLC-ordered Event Journal. No module assumes state persistence outside of event-log replay. Modules derive operational state exclusively from replayable journal events and never from mutable local storage.
- **Preference Sovereignty:** The `Concierge` and `Cockpit` modules are programmatically restricted from bypassing the `preferred_barber_id` without Event 12.
- **Append-Only Enforcement:** All capability-driven state changes resolve to a `commitEvent()` operation. No "Edit" logic is present in any capability module.
- **Session Integrity:** The `Terminal Operations` module gates all domain module access, ensuring every event contains valid cryptographic actor attribution.
