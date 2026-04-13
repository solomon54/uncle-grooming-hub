**PRS v1.1 — Architectural Refinement Pass**

This document provides a refined and validated version of the **Projection & Runtime Specification (PRS)**. It aligns the projection logic with the canonical event names from **ECS v1.3** and the authority boundaries of **TAS v1.1**.

---

# 1. Runtime Architecture Overview

The system SHALL operate using an **Event → Projection → Interface** pipeline.

```
Event Journal (Source of Truth)
        ↓
Projection Engine (Pure Functions)
        ↓
Materialized Views (State)
        ↓
Interfaces (IMS Projection Consumers)
```

Projections SHALL NOT introduce business logic. They are deterministic, read-only interpretations of the HLC-ordered Event Journal.

---

# 2. Projection Principles

## 2.1 Determinism

Given the same ordered event stream, every terminal and cloud node MUST produce identical materialized views. Projection handlers SHALL be **Pure**, **Idempotent**, and **Side-effect free**.

## 2.2 Authority Separation

- **ECS:** Defines valid state transitions (The "What").
- **PRS:** Defines observable state construction (The "How it looks").
- **IMS:** Consumes projections for rendering (The "Visual").

Interfaces SHALL NEVER compute domain state independently or bypass the projection layer to read the raw journal.

## 2.3 Incremental Projection Model

Projections SHALL update incrementally upon event commitment. A full replay of the journal SHALL occur ONLY during cold starts, recovery cycles, or upon detection of projection checksum mismatches.

---

# 3. Projection Engine

## 3.1 Runtime Components

Local terminals SHALL accept events originating from cloud or local actors equally; event origin SHALL NOT imply authority unless defined by TAS authority rules.

### Local Projection Engine

Runs on every shop terminal.

- **Responsibilities:** Maintain real-time `QueueBoardView` and `BarberLaneState` to enable 100% offline operational sovereignty.
- **Sync Logic:** Rebuilds views if late-arriving events are inserted into the HLC sequence.

### Cloud Projection Engine

Runs on the canonical tier.

- **Responsibilities:** Aggregate global `TransactionLedgerView`, compute cross-branch `AvailabilityCalendar`, and detect `RECONCILIATION_ANOMALY` events (Event 16).

---

# 4. Canonical Projection Catalog

## 4.1 QueueBoardView

**Purpose:** Operational waiting queue respecting Preference Sovereignty (TAS §13).
**Consumes Events:**

- `01 CUSTOMER_CHECKED_IN`
- `03 CUSTOMER_CALLED_TO_CHAIR`
- `12 QUEUE_TRANSFER_CONSENTED`
- `19 APPOINTMENT_RESERVED`
- `20 RESERVATION_CANCELLED`
- `25 RESERVATION_EXPIRED`

**Rules:**

- Queue ordering MUST preserve customer preferred barber.
- Reordering SHALL NOT occur automatically for optimization.
- Transfer allowed ONLY after `EVENT 12`.

**Owner:** Local Terminal

## 4.2 BarberLaneState

**Purpose:** Real-time barber operational status and recurring schedule baseline.
**Consumes Events:**

- `02 BARBER_AVAILABLE`
- `03 CUSTOMER_CALLED_TO_CHAIR`
- `04 SERVICE_ENGAGED`
- `05 SERVICE_COMPLETED`
- `23 BARBER_SCHEDULE_UPDATED`

**Owner:** Local Terminal

## 4.3 AvailabilityCalendar

**Purpose:** Reservation slot projection for remote and on-site scheduling.
**Consumes Events:**

- `19 APPOINTMENT_RESERVED`
- `20 RESERVATION_CANCELLED`
- `23 BARBER_SCHEDULE_UPDATED`
- `24 SHOP_HOURS_CHANGED`
- `05 SERVICE_COMPLETED` (for duration averages)

**Projection Rules:**

- Durations MUST be calculated as the arithmetic mean of the HLC delta between `EVENT 05` and `EVENT 04` for specific service IDs.
- Projections SHALL NOT persist duration values in the journal.

**Owner:** Cloud Authority (Primary), Local Terminal (Read-only cache)

## 4.4 TransactionLedgerView

**Purpose:** Financial read model for itemized billing and settlement.
**Consumes Events:**

- `04 SERVICE_ENGAGED` (Initializes record)
- `05 SERVICE_COMPLETED`
- `06 PAYMENT_INTENT_CREATED`
- `08 PAYMENT_SETTLED`
- `09 ADJUSTMENT_EVENT`

**Owner:** Cloud Authority

---

# 5. Projection Storage Strategy

| Projection               | Storage Model                | Persistence             |
| :----------------------- | :--------------------------- | :---------------------- |
| **QueueBoardView**       | SQLite / IndexedDB           | Persistent              |
| **BarberLaneState**      | In-Memory Object + Snapshots | Persistent              |
| **AvailabilityCalendar** | Cloud Document Store         | Persistent              |
| **TransactionLedger**    | Cloud Relational Store       | Permanent (Audit-Grade) |
| **StatusBoardView**      | Local Broadcast (WebSocket)  | Ephemeral               |

---

# 6. Snapshot Strategy

Snapshots SHALL be used to bound journal replay duration.

| Aggregate / Projection | Snapshot Trigger | Components                                                    |
| :--------------------- | :--------------- | :------------------------------------------------------------ |
| **QueueEntry**         | Every 50 events  | `aggregate_version`, `hlc_high_water_mark`, `state_hash`      |
| **Transaction**        | Every 20 events  | `aggregate_version`, `hlc_high_water_mark`, `itemization_sum` |
| **BarberLane**         | Every 30 events  | `aggregate_version`, `status`, `last_actor_id`                |

---

# 7. Offline Convergence Rules

## 7.1 Event Arrival Reordering (Time Travel)

If the sync layer inserts an event with an HLC position earlier than the current projection state, the engine SHALL:

1.  Roll back to the snapshot preceding the late event.
2.  Replay all events in corrected HLC sequence.
3.  Update the Materialized View.

## 7.2 Deterministic Conflict Resolution

If duplicate `event_id` or invalid `aggregate_version` sequences are detected, the projection engine MUST discard the invalid event and emit a `16 RECONCILIATION_ANOMALY_DETECTED` signal to the Admin Dashboard.

---

# 8. Interface Contract (IMS Binding)

Interfaces SHALL:

- Subscribe to projection state changes.
- NEVER access the raw Event Journal directly.
- NEVER compute ordering, wait-times, or durations.
- Treat UI state as a **Pure Projection** of the Journal.

---

# 9. Performance Guarantees

| Operation                   | Target Performance                              |
| :-------------------------- | :---------------------------------------------- |
| **Local Projection Update** | < 10ms (Immediate local feedback)               |
| **Queue Refresh (LAN)**     | < 50ms (mDNS/WebSocket propagation)             |
| **Full Journal Replay**     | < 3s (up to 50,000 events on baseline hardware) |
| **Cloud Availability Calc** | < 200ms (Internet reservation latency)          |

---

# 10. Architectural Compliance

This specification guarantees:

1.  **Append-only Integrity:** Views are built from an immutable log.
2.  **Financial Finality:** The `TransactionLedgerView` reflects only cloud-authorized settlement.
3.  **Customer Preference Sovereignty:** The `QueueBoardView` logic makes automatic reordering mathematically impossible.
4.  **Offline Sovereignty:** Local terminals possess all necessary data to maintain operational views without cloud connectivity.
