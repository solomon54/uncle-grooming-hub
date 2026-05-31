/**
 * @file event.types.ts
 * @module domain/events
 *
 * Canonical EventType union — single source of truth.
 *
 * Specification: ECS v1.3 (Events 01–25) + ECS v1.4 pending (Events 26–31)
 *                AGENT.md §12 — New Events
 *
 * All 31 event types defined here. Any addition requires updating:
 *   1. This file (EventType union)
 *   2. event.definitions.ts (payload interface)
 *   3. local-journal-cloud-ladger.ts (EVENT_TYPE_ENUM array)
 */

export type EventType =
  // ── Operational / Queue (ECS v1.3) ──────────────────────────────────────
  | "CUSTOMER_CHECKED_IN"           // 01 — Local (Cashier)
  | "BARBER_AVAILABLE"              // 02 — Local (Barber)
  | "CUSTOMER_CALLED_TO_CHAIR"      // 03 — Local (Cashier/Admin)
  | "SERVICE_ENGAGED"               // 04 — Local (Barber)
  | "SERVICE_COMPLETED"             // 05 — Local (Barber)
  // ── Financial (ECS v1.3) ────────────────────────────────────────────────
  | "PAYMENT_INTENT_CREATED"        // 06 — Local (Cashier)
  | "PAYMENT_PROCESSING"            // 07 — Local (Cashier)
  | "PAYMENT_SETTLED"               // 08 — CLOUD AUTHORITY ONLY
  | "ADJUSTMENT_EVENT"              // 09 — Local (Admin)
  // ── Identity (ECS v1.3) ─────────────────────────────────────────────────
  | "ACCOUNT_VERIFIED"              // 10 — Local (Cashier)
  | "IDENTITY_MERGED"               // 11 — CLOUD AUTHORITY ONLY
  | "QUEUE_TRANSFER_CONSENTED"      // 12 — Local (Cashier)
  // ── Session (ECS v1.3) ──────────────────────────────────────────────────
  | "OPERATOR_SESSION_OPENED"       // 13 — Local (Any operator)
  | "OPERATOR_SESSION_CLOSED"       // 14 — Local (Any operator)
  // ── Sync / Infrastructure (ECS v1.3) ────────────────────────────────────
  | "SYNC_BATCH_ACKNOWLEDGED"       // 15 — CLOUD AUTHORITY ONLY
  | "RECONCILIATION_ANOMALY_DETECTED" // 16 — CLOUD AUTHORITY ONLY
  | "LOCAL_SNAPSHOT_COMMITTED"      // 17 — Local (System)
  | "TERMINAL_RECOVERY_COMPLETED"   // 18 — Local (System)
  // ── Reservations / Intents (ECS v1.3) ───────────────────────────────────
  | "APPOINTMENT_RESERVED"          // 19 — CLOUD AUTHORITY ONLY
  | "RESERVATION_CANCELLED"         // 20 — Dual authority (Local OR Cloud)
  | "SERVICE_INTENT_ADDED"          // 21 — Dual authority (forbidden after EVENT 04)
  | "SERVICE_INTENT_REMOVED"        // 22 — Dual authority (forbidden after EVENT 04)
  // ── Schedule / Config (ECS v1.3) ────────────────────────────────────────
  | "BARBER_SCHEDULE_UPDATED"       // 23 — Local (Barber/Admin)
  | "SHOP_HOURS_CHANGED"            // 24 — Local (Admin only)
  // ── System / Deterministic (ECS v1.3) ───────────────────────────────────
  | "RESERVATION_EXPIRED"           // 25 — System (deterministic, hash-based emitter)
  // ── Notifications (ECS v1.4 pending — AGENT.md §12) ─────────────────────
  | "CUSTOMER_NOTIFICATION_SENT"    // 26 — CLOUD AUTHORITY ONLY
  // ── Staff Account Management (ECS v1.4 pending — AGENT.md §12) ──────────
  | "STAFF_ACCOUNT_CREATED"         // 27 — Local (Admin/System Owner only)
  | "STAFF_PIN_CHANGED"             // 28 — Local (Self or Admin)
  | "STAFF_ACCOUNT_DEACTIVATED"     // 29 — Local (Admin/System Owner only)
  | "STAFF_ACCOUNT_REACTIVATED"     // 30 — Local (Admin/System Owner only)
  | "TERMINAL_PIN_CHANGED"          // 31 — Local (Admin/System Owner only)
  // ── Service Catalog Management (ECS v1.4 pending) ──────────────────────────
  | "SERVICE_REGISTERED"            // 32 — Local (Admin/System Owner only)
  | "SERVICE_PRICE_UPDATED"         // 33 — Local (Admin/System Owner only)
  | "SERVICE_VISIBILITY_TOGGLED";   // 34 — Local (Admin/System Owner only)

/**
 * Actor roles — AGENT.md §13 (updated from 5 to 6 roles)
 */
export type ActorRole =
  | "BARBER"
  | "CASHIER"
  | "ADMIN"
  | "SYSTEM_OWNER"  // Super-admin — SOS v1.0 §3
  | "CLOUD"         // Cloud canonical tier events
  | "SYSTEM";       // Deterministic system events (EVENT 25)
