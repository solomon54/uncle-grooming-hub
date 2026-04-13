<!-- ⚠️ ARCHIVED DOCUMENT

This specification has been superseded by ECS v1.2.
Retained for historical traceability only.
Not authoritative for implementation. -->

# 📘 **Event Catalog Specification (ECS) v1.0**

**Project:** Uncle Grooming Hub  
**Derived From:** TAS v1.0 (Technical Architecture Specification)  
**Architecture:** Event-Sourced / Local-First Sovereign System  
**Purpose:** Define canonical domain and system events governing deterministic state transitions and financial integrity.

---

### 0. Domain Principles & Invariants (Inherited from TAS v1.0)

All events defined herein MUST strictly adhere to these constraints:

1. **Append-only Invariant:** No event SHALL mutate or delete historical data. All corrections require a new `ADJUSTMENT_EVENT` (TAS §2).
2. **HLC Total Ordering:** Events are ordered by Hybrid Logical Clock (HLC) to ensure deterministic convergence across distributed terminals (TAS §4).
3. **Local Operational Authority:** Local terminals are the sole authority for operational state changes (Queue/Service) during internet outages (TAS §1).
4. **Cloud Financial Finality:** The Cloud Canonical Tier is the **exclusive** authority for transitioning transactions to a `SETTLED` state (TAS §6).
5. **Customer Preference Sovereignty:** The system SHALL NOT reorder the queue or reassign barbers automatically. Any change to customer preference MUST be recorded via an explicit consent event (TAS §13).
6. **Concurrency Control:** Every event MUST include an `aggregate_version`. Terminals MUST reject events where `incoming_version != expected_next_version` (TAS §2).

---

### 1️⃣ Aggregate Map

| Aggregate           | Responsibility                                                        |
| :------------------ | :-------------------------------------------------------------------- |
| **CustomerProfile** | Identity lifecycle and "Verified Account" status.                     |
| **QueueEntry**      | Waiting state and arrival-order sequence.                             |
| **BarberLane**      | Barber availability, lane-specific engagement, and service execution. |
| **Transaction**     | Itemized financial lifecycle (Revenue vs. Tips).                      |
| **TerminalSession** | Operator authentication and shared-device security boundaries.        |
| **SystemProcess**   | Observability for synchronization, snapshots, and recovery.           |

---

### 2️⃣ Canonical Event Definitions

#### **Domain Events (01–12)**

**EVENT 01 — CUSTOMER_CHECKED_IN**

- **Aggregate:** `QueueEntry`
- **Actor:** Cashier Terminal
- **Preconditions:** Customer UUID not already `ACTIVE` in global queue.
- **Payload:** `customer_uuid`, `preferred_barber_id`, `checkin_method`, `shadow_profile_flag`.
- **State Effects:** `QueueEntry` → `WAITING`.
- **Invariants:** Customer preference is locked. Arrival timestamp is recorded for FIFO fairness (TAS §5.1).

**EVENT 02 — BARBER_AVAILABLE**

- **Aggregate:** `BarberLane`
- **Actor:** Barber
- **State Effects:** `barber_state` → `AVAILABLE`.

**EVENT 03 — CUSTOMER_CALLED_TO_CHAIR**

- **Aggregate:** `BarberLane`
- **Actor:** Cashier/Admin (Manual Recommendation)
- **Preconditions:** `QueueEntry` is `WAITING`; `BarberLane` is `AVAILABLE`.
- **Payload:** `queue_entry_id`, `barber_id`.
- **State Effects:** `customer_state` → `CALLED`; `barber_state` → `RESERVED`.
- **Invariants:** `barber_id` MUST match `preferred_barber_id` unless a `QUEUE_TRANSFER_CONSENTED` event exists (TAS §13).

**EVENT 04 — SERVICE_ENGAGED**

- **Aggregate:** `BarberLane`
- **Actor:** Barber
- **Preconditions:** State is `CALLED`.
- **State Effects:** `customer` → `IN_SERVICE`; `barber` → `ENGAGED`.
- **Invariants:** Initializes the `Transaction` aggregate and locks the `price_snapshot` at the moment of engagement (TAS §3.1).

**EVENT 05 — SERVICE_COMPLETED**

- **Aggregate:** `Transaction`
- **Actor:** Barber
- **State Effects:** `service_state` → `COMPLETED`; `payment_state` → `PENDING`.
- **Invariants:** Releases `BarberLane` to `AVAILABLE`.

**EVENT 06 — PAYMENT_INTENT_CREATED**

- **Aggregate:** `Transaction`
- **Actor:** Cashier
- **Payload:** `base_price`, `tip_amount`, `payment_method`.
- **Invariants:** Itemization MUST be stored separately (Shared Revenue vs. Barber Tip). Total is locked for the duration of the session (TAS §6.3).

**EVENT 07 — PAYMENT_PROCESSING**

- **Aggregate:** `Transaction`
- **Actor:** System (Local Terminal)
- **State Effects:** `payment_state` → `PROCESSING`.
- **Invariants:** Used for digital gateway redirection; local terminal maintains record during webhook lag.

**EVENT 08 — PAYMENT_SETTLED**

- **Authority:** **Cloud Canonical Tier ONLY**
- **Actor:** System Actor (Cloud)
- **Preconditions:** Verified gateway webhook or verified Admin cash confirmation.
- **State Effects:** `payment_state` → `SETTLED`; virtual wallets updated; `Recognition_Units` unlocked.
- **Invariants:** This is the only event that achieves financial finality (TAS §6.5).

**EVENT 09 — ADJUSTMENT_EVENT**

- **Aggregate:** `Transaction`
- **Actor:** Admin
- **Rules:** MUST reference `original_transaction_uuid`; MUST contain `reason_code`.
- **Invariants:** Non-destructive correction; creates a compensating ledger entry (TAS §6.8).

**EVENT 10 — ACCOUNT_VERIFIED**

- **Aggregate:** `CustomerProfile`
- **State Effects:** `shadow_profile` → `verified_account`.
- **Invariants:** Links historical UUID activity to a verified phone number (TAS §4.3).

**EVENT 11 — IDENTITY_MERGED**

- **Authority:** **Cloud Canonical Tier ONLY**
- **State Effects:** Secondary UUID archived; event history reassigned to Primary UUID.

**EVENT 12 — QUEUE_TRANSFER_CONSENTED (TAS §13.3)**

- **Aggregate:** `QueueEntry`
- **Actor:** Cashier (Facilitator)
- **Preconditions:** `customer_consent == TRUE`; `receiving_barber_acceptance == TRUE`.
- **Payload:** `originating_barber_id`, `receiving_barber_id`, `consent_confirmation_flag`.
- **State Effects:** Reassigns `preferred_barber_id` for the current session.
- **Forbidden:** System-initiated or automatic reassignment.

---

#### **Infrastructure & System Events (13–18)**

**EVENT 13 — OPERATOR_SESSION_OPENED**

- **Aggregate:** `TerminalSession`
- **Actor:** Operator (Cashier/Barber)
- **Payload:** `actor_id`, `role`, `terminal_id`, `auth_method`.
- **State Effects:** Attributes all subsequent local events to this `actor_id`.
- **Invariants:** RBAC enforced locally for offline security (TAS §2.4).

**EVENT 14 — OPERATOR_SESSION_CLOSED**

- **Aggregate:** `TerminalSession`
- **State Effects:** Clears current `actor_id` from terminal state.

**EVENT 15 — SYNC_BATCH_ACKNOWLEDGED**

- **Aggregate:** `SystemProcess`
- **Actor:** System Actor (Cloud)
- **Payload:** `batch_id`, `last_synced_hlc`.
- **State Effects:** Marks local journal entries as `Cloud_Verified`.
- **Invariants:** Prerequisite for local journal pruning (TAS §10.4).

**EVENT 16 — RECONCILIATION_ANOMALY_DETECTED**

- **Aggregate:** `Transaction` / `QueueEntry`
- **Authority:** **Cloud Canonical Tier ONLY**
- **Payload:** `anomaly_type`, `cloud_snapshot`, `local_snapshot`.
- **State Effects:** Flags aggregate for Admin manual review; blocks further state changes.

**EVENT 17 — LOCAL_SNAPSHOT_COMMITTED**

- **Aggregate:** `SystemProcess`
- **Actor:** Local Terminal
- **Payload:** `snapshot_hlc`, `snapshot_checksum`.
- **Invariants:** Reconstitution performance baseline (TAS §3).

**EVENT 18 — TERMINAL_RECOVERY_COMPLETED**

- **Aggregate:** `SystemProcess`
- **State Effects:** Logs replay duration and event count for observability (TAS §14.1).

---

### 3️⃣ Implementation Invariants & Concurrency

1. **Session Linkage:** Every domain event (01–12) MUST include `metadata.session_id` derived from the active `OPERATOR_SESSION_OPENED` event.
2. **Pruning Safety:** A terminal SHALL NOT prune local journal events until it contains both a `SYNC_BATCH_ACKNOWLEDGED` event and a `LOCAL_SNAPSHOT_COMMITTED` event covering the relevant HLC range.
3. **Concurrency Validation:** Every event commit MUST satisfy: `incoming.aggregate_version == current_version + 1`.
4. **Idempotency:** All events MUST be keyed by a unique `event_id`. Duplicate `event_id` arrivals in the Cloud Tier SHALL be acknowledged but ignored (TAS §5).

---

### 4️⃣ Critical Corrections made during Merger

- **Financial Finality:** Standardized all financial lifecycle events to use the term **Settled** for cloud-confirmed finality and **Completed** for the physical barbering service.
- **Loyalty Terminology:** Standardized on **Recognition Units** (deterministic ledger units) rather than "Points" (UI representation).
- **Authority Clarification:** Explicitly marked Events 08, 11, and 16 as **Cloud Authority Only** to prevent "Ghost Settlement" or "Ghost Merges" during offline terminal operations.
- **Metadata Requirement:** Added `aggregate_version` to the core schema to support optimistic concurrency as mandated by TAS §2.
