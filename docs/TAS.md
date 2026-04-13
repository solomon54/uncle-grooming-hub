# Technical Architecture Specification (TAS) v1.0

**Project Name:** Uncle Grooming Hub  
**System Type:** Offline-First Distributed Event-Sourced POS/Queue  
**Architecture Pattern:** Event Sourcing with Local-First Sovereignty  
**Date:** April 05, 2026

---

### 1. System Architecture Overview

The system architecture SHALL consist of a **Distributed Local-First Tier** and a **Cloud Canonical Tier**.

- **Local Terminal Tier:** Individual hardware nodes (Tablets/PCs) operating within a Shop Local Area Network (LAN). Every terminal MUST maintain a local instance of the **Event Journal**.
- **Shop Local Authority:** For active operational sessions (Queue, Service), the Local Tier is the primary authority. Terminals SHALL communicate peer-to-peer via the LAN to maintain state synchronicity without requiring internet backhaul.
- **Cloud Canonical Tier:** Acts as the long-term archival store and financial source of truth. It is responsible for cross-terminal reconciliation, global identity resolution, and webhook-based payment verification.
- **Trust Boundaries:**

  - **Local Trust:** High. Actors (Cashier/Barber) are authenticated locally via encrypted credential hashes.
  - **Cloud Trust:** Absolute for financial finality. The cloud ledger SHALL override local calculations in the event of a deterministic conflict during reconciliation.
  - **Gateway Trust:** External. Webhooks from Telebirr/Chapa are the only signals permitted to transition a transaction to `Settled`.

- **1.1 Consistency Model:** The system SHALL operate under **Eventual Consistency with Deterministic Convergence**. All replicas MUST converge to an identical state once event propagation completes, governed by the total ordering of the Hybrid Logical Clock (HLC).
- **1.2 Hardware-Bound Terminal Identity:** The `terminal_id` MUST be hardware-derived and non-user editable. Identity SHALL bind to a Secure Enclave or Trusted Platform Module (TPM) when hardware support is available. Reinstallation of the software environment SHALL NOT generate a new identity without explicit Cloud Authority authorization.

---

### 2. Event Model Specification

The system MUST utilize an append-only Event Model. All state changes SHALL be recorded as discrete, immutable event objects.

- **Event Schema:**

  - `event_id`: UUID v7 (Time-ordered).
  - `aggregate_id`: UUID (The specific Entity ID, e.g., `transaction_uuid`).
  - `aggregate_version`: Monotonically increasing integer (Required).
  - `type`: String (e.g., `SERVICE_ENGAGED`, `PAYMENT_INTENT_CREATED`).
  - `payload`: JSONB (Event-specific data).
  - `metadata`:
    - `hlc_timestamp`: Hybrid Logical Clock string.
    - `partition_epoch`: Integer identifier for network partition segments (Optional).
    - `terminal_id`: Unique hardware identifier.
    - `actor_id`: UUID of the authenticated operator.
    - `version`: Integer (Schema versioning).
    - `signature`: HMAC-SHA256 of the event content.

- **Example Event Object:**

```json
{
  "event_id": "018eaf34-...",
  "aggregate_id": "77e1-...",
  "aggregate_version": 4,
  "type": "SERVICE_ENGAGED",
  "payload": {
    "barber_id": "b1",
    "customer_uuid": "c1",
    "price_at_engagement": 500
  },
  "metadata": {
    "hlc": "1712329800000:0001:term_01",
    "actor_id": "barber_01",
    "version": 1
  }
}
```

- **Concurrency Control:** Every event SHALL include an `aggregate_version`. Terminals MUST reject events where `incoming_version != expected_next_version` for the specific `aggregate_id`. This ensures optimistic concurrency protection across distributed terminals.
- **Event Payload Constraints:** The total size of an event payload SHALL NOT exceed **32KB**. Oversized payloads MUST be rejected locally by the terminal before journal append.
- **Schema Evolution Strategy:** The system SHALL maintain backward compatibility for **N-2** schema versions. Older events MUST be transformed into the current runtime format using an **Upcaster Layer** during journal replay. Historical events persisted in the journal SHALL NEVER be rewritten or mutated.

---

### 3. Local Event Journal Design

Terminals SHALL use an embedded relational or document store (e.g., SQLite with WAL or RxDB) to persist the Event Journal.

- **Write-Ahead Logging (WAL):** All journal writes MUST be committed to a WAL before being applied to the local state materialized views.
- **Snapshotting:** To optimize recovery, terminals SHOULD generate a "State Snapshot" every 1,000 events. Each state snapshot SHALL include a **checksum hash** and a **terminal digital signature**. Snapshot validation MUST occur before journal replay. Invalid or corrupted snapshots SHALL be discarded automatically and rebuilt from a full journal replay.
- **Journal Replay:** Upon startup, the system SHALL:
  1. Load the last verified Snapshot.
  2. Scan the Journal for all events where `hlc_timestamp` > `snapshot_hlc`.
  3. Replay events in sequence to reconstitute the active `Master Queue` and `Barber Lanes`.
- **Local Durability:** Journal writes MUST be synchronous to ensure data survives immediate power loss.
- **Replay Performance Objective:** Cold start recovery (Snapshot loading + Journal replay) SHALL complete within **≤5 seconds for 50,000 events** on supported baseline hardware.
- **Dynamic Snapshotting:** The snapshot frequency SHOULD dynamically adjust based on measured replay duration to maintain the 5-second recovery target.

---

### 4. Distributed Ordering & Clock Strategy

The system SHALL implement a **Hybrid Logical Clock (HLC)** to maintain a total ordering of events across multiple terminals without a central coordinator.

- **Timestamp Composition:** `(Physical_Time : Logical_Counter : Terminal_ID)`.
- **Conflict Ordering Rules:**
  1. Compare `Physical_Time` (Wall clock).
  2. If equal, compare `Logical_Counter`.
  3. If equal, use `Terminal_ID` as a deterministic tie-breaker.
- **Clock Drift Tolerance:** Terminals SHALL reject events with an HLC timestamp > `local_wall_time + 60s` to prevent malicious or accidental future-dating.
- **Untrusted Wall-Clock:** Wall-clock time is metadata only. The HLC sequence SHALL be the only authoritative metric for "happened-before" relationships.

---

### 5. Synchronization Protocol

Sync logic SHALL follow a "Push-Pull-Reconcile" flow.

- **Sync Triggers:**
  1. Event-driven (immediate push on local commit if online).
  2. Interval-driven (every 60s heartbeat).
  3. Manual (Admin force-reconcile).
- **Batch Construction:** Events SHALL be bundled into atomic batches of up to 100, ordered by HLC.
- **Idempotency Enforcement:** The Cloud API MUST use `event_id` as an idempotency key. Redundant transmissions of the same `event_id` SHALL return a `200 OK` without duplicating the ledger entry.
- **Flapping Network Handling:** The sync engine SHALL implement an exponential backoff with jitter. No batch SHALL be cleared from the "Pending Sync" local queue until a verified `ACK` is received from the Cloud.

---

### 6. Financial Ledger Reconciliation

Financial integrity is maintained through a strict Journal-to-Ledger transformation.

1. **Event Ingestion:** Cloud receives `SERVICE_COMPLETED` event -> creates `Payment_Pending` record.
2. **Intent Generation:** Local terminal creates `PAYMENT_INTENT_CREATED` event with itemized `base_price` and `tip`.
3. **Webhook Hook:** Payment Gateway sends `SUCCESS` webhook -> Cloud appends `PAYMENT_SETTLED` event to the canonical ledger.
4. **Double-Entry Verification:** Upon settlement, the System Actor SHALL verify: `Debit (Gateway_Account) == Credit (Shared_Revenue_Wallet) + Credit (Barber_Tip_Wallet)`.
5. **Adjustment Mechanics:** Errors MUST be corrected via `ADJUSTMENT_EVENT` entries linked to the original `transaction_uuid`. The system SHALL NOT permit modification of original events.

---

### 7. Multi-Terminal LAN Replication

In multi-terminal environments, shop devices MUST maintain sub-second state parity via the LAN.

- **Peer Discovery:** Terminals SHALL use mDNS (Multicast DNS) or a static "Local Hub" IP to discover peers on the same subnet.
- **State Propagation:** State changes (e.g., `CALLED_TO_CHAIR`) MUST be broadcast via WebSockets to all local peers immediately.
- **Conflict Arbitration:** If two terminals attempt to "Call" the same customer simultaneously, the event with the **lowest HLC** SHALL prevail; the losing terminal MUST rollback its local UI state and notify the operator.
- **7.1 LAN Network Partition Handling:**
  - **Quorum Detection:** Terminals SHALL utilize heartbeats to detect peer quorum loss. If a terminal cannot communicate with the designated primary terminal or a majority of peers, it MUST enter **Isolated Mode**.
  - **Isolated Operations:** Events created during Isolated Mode MUST include a `partition_epoch` metadata field.
  - **Reintegration:** Upon LAN reconnection, reconciliation SHALL prioritize deterministic HLC ordering. The system SHALL append `CONFLICT_ANNOTATION` events where automated merging requires logical verification.

---

### 8. Identity & Shadow Profile Resolution

Identity MUST support anonymous entry with late-binding verification.

- **UUID v7 Generation:** All profiles MUST be initialized with a UUID v7 locally.
- **Duplicate Handling:** If two Shadow Profiles are created for the same phone number (offline), the Cloud SHALL flag these for merge.
- **Deduplication Algorithm:**
  1. Match `Verified_Identifier` (Phone).
  2. Identify the `Primary_Profile` (Earliest created).
  3. Append a `IDENTITY_MERGED` event to the secondary profile, re-pointing all its historical `transaction_uuids` to the primary.
- **Promotion Flow:** Conversion from Shadow to Verified requires an `ACCOUNT_VERIFIED` event containing an OTP-validated token.

---

### 9. Security Architecture

- **Encryption at Rest:** Databases MUST be encrypted using AES-256-GCM. Keys SHALL be stored in the device's Secure Enclave/TPM.
- **Device Authorization:** Terminals MUST authenticate with the Cloud using an X.509 Client Certificate or a hardware-bound JWT.
- **RBAC Enforcement:** Permission checks SHALL be performed against the local session's `actor_role` before appending events to the Journal.
- **Audit Signing:** Every event batch MUST be signed by the Terminal Key, ensuring that un-synced events cannot be tampered with on the physical disk.
- **Cryptographic Key Lifecycle Management:**
  - **Rotation:** Terminal signing keys SHALL rotate every **90 days**.
  - **Revocation:** Cloud Authority MUST maintain a Certificate Revocation List (CRL). Revoked certificates MUST immediately block cloud synchronization and local peer replication.
  - **Loss Mitigation:** Compromised or lost terminals SHALL be remotely revoked via Cloud Authority, triggering an immediate wipe of local encryption keys upon the next network handshake.

---

### 10. Failure Recovery Algorithms

- **Power Loss:** Upon restart, the system SHALL perform a WAL recovery on the SQLite/local database and replay the journal from the last snapshot to restore the "Cinema Dark" dashboard.
- **Device Replacement:** A new terminal SHALL:
  1. Authenticate and download the `Global_Config` (Prices, Roster).
  2. Pull the full `Canonical_Event_Stream` for the current shop.
  3. Reconstitute the state.
- **Journal Corruption:** If the local journal fails a checksum, the terminal MUST wipe its local database and perform a Full Pull from the Cloud.

---

### 11. Observability & Telemetry

The system SHALL emit metrics locally to be synced when online:

- **Latency Metrics:** HLC-to-Cloud settlement time (P95).
- **Consistency Metrics:** Count of `RECONCILIATION_DISCREPANCY` events.
- **Sync Health:** `bytes_pending_sync`, `last_successful_sync_timestamp`.
- **Operational Telemetry:** `terminal_heartbeat`, `battery_level`, `storage_utilization`.

---

### 12. Extension Architecture

To facilitate Phase 2 expansion without destabilizing Phase 1:

- **Plugin Isolation:** Extensions (e.g., Coffee Sales) MUST run as isolated modules that interact with the core solely by appending valid `EXTENSION_TRANSACTION` events to the journal.
- **Event Hooks:** The core system SHALL provide a "Read-Only Hook" that allows plugins to listen to `SERVICE_COMPLETED` events to trigger secondary workflows.
- **Safety Boundary:** Extensions SHALL NOT have the permission to modify `Master Queue` states or core `Service Price` registries. All extension events MUST follow the itemized ledger model to ensure financial auditability.

---

### 13. Operational Queue Sovereignty

The system SHALL preserve **Customer Preference Sovereignty** as a fundamental operational invariant.

- **13.1 Preference Preservation:** The Master Queue SHALL preserve and enforce the customer's selected barber preference at all times.
- **13.2 Anti-Optimization Invariant:** Automated queue reordering for the purpose of system efficiency or "load balancing" SHALL NOT occur.
- **13.3 Transfer Protocol:** A customer MAY transition to an alternative barber lane ONLY when both of the following conditions are met:
  1. A customer provides explicit verbal or digital consent.
  2. The receiving barber explicitly accepts the transfer.
- **13.4 Authority Boundaries:** Cashier, Admin, or System Actor roles SHALL NOT override customer preference unilaterally.
- **13.5 Documentation of Consent:** All transfers MUST generate a `QUEUE_TRANSFER_CONSENTED` event containing:
  - `originating_barber_id`
  - `receiving_barber_id`
  - `actor_id` (initiator)
  - `consent_confirmation_flag`
- **13.6 Balancing Logic:** System-level balancing suggestions SHALL operate only on **Idle Barber Offers** (notifying a customer that another barber is free), never on forced reassignment.
- **13.7 Auditability:** All changes to customer preference attributes MUST be recorded in the immutable audit log for transparency and partner dispute resolution.
