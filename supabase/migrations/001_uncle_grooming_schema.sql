-- ============================================================
-- Uncle Grooming Hub — Supabase Schema Migration v1
-- Schema: uncle_grooming
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create schema
CREATE SCHEMA IF NOT EXISTS uncle_grooming;

-- ── Event Journal (append-only, canonical cloud ledger) ───────────────────────

CREATE TABLE IF NOT EXISTS uncle_grooming.events (
  event_id          TEXT        PRIMARY KEY,
  aggregate_id      TEXT        NOT NULL,
  aggregate_version INTEGER     NOT NULL,
  event_type        TEXT        NOT NULL,
  payload           JSONB       NOT NULL DEFAULT '{}',
  metadata          JSONB       NOT NULL DEFAULT '{}',
  hlc_timestamp     TEXT        NOT NULL DEFAULT '',
  terminal_id       TEXT,
  actor_id          TEXT,
  session_id        TEXT,
  is_synced         BOOLEAN     NOT NULL DEFAULT true,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_aggregate_id  ON uncle_grooming.events (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_hlc           ON uncle_grooming.events (hlc_timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type    ON uncle_grooming.events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_received_at   ON uncle_grooming.events (received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_agg_version ON uncle_grooming.events (aggregate_id, aggregate_version);

-- ── Operator Roster ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uncle_grooming.operators (
  actor_id       TEXT        PRIMARY KEY,
  email          TEXT        NOT NULL UNIQUE,  -- login identifier
  name           TEXT        NOT NULL,
  role           TEXT        NOT NULL CHECK (role IN ('SYSTEM_OWNER','ADMIN','CASHIER','BARBER')),
  pin_hash       TEXT        NOT NULL,  -- HMAC-SHA256(pin, actor_id) — never plain text
  barber_id      TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  is_first_login BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operators_email    ON uncle_grooming.operators (email);
CREATE INDEX IF NOT EXISTS idx_operators_role     ON uncle_grooming.operators (role);
CREATE INDEX IF NOT EXISTS idx_operators_active   ON uncle_grooming.operators (is_active);

-- ── Sync Batches ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uncle_grooming.sync_batches (
  batch_id      TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  terminal_id   TEXT        NOT NULL,
  event_count   INTEGER     NOT NULL DEFAULT 0,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Service role key bypasses RLS — used by API routes only
-- Anon key has no direct table access

ALTER TABLE uncle_grooming.events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE uncle_grooming.operators    ENABLE ROW LEVEL SECURITY;
ALTER TABLE uncle_grooming.sync_batches ENABLE ROW LEVEL SECURITY;

-- ── System Owner: Solomon Tsehay ─────────────────────────────────────────────
--
-- PIN hash = HMAC-SHA256(pin, actor_id)
-- The app uses Web Crypto API to compute this client-side.
--
-- For the initial seed, we use pgcrypto's hmac() function:
--   hmac(pin_bytes, actor_id_bytes, 'sha256')
--
-- IMPORTANT: Solomon must change his PIN on first login.
-- The initial PIN "000000" is a temporary placeholder.
-- is_first_login = true forces the PIN change screen.

INSERT INTO uncle_grooming.operators (
  actor_id,
  email,
  name,
  role,
  pin_hash,
  is_active,
  is_first_login
) VALUES (
  'actor_owner_solomon',
  'solomontsehay50@gmail.com',
  'Solomon Tsehay',
  'SYSTEM_OWNER',
  encode(digest('000000', 'sha256'), 'hex'),
  true,
  true
)
ON CONFLICT (actor_id) DO UPDATE SET
  email          = EXCLUDED.email,
  name           = EXCLUDED.name,
  updated_at     = NOW();

-- ============================================================
-- Verify tables were created:
-- SELECT actor_id, email, name, role, is_first_login
-- FROM uncle_grooming.operators;
--
-- SELECT COUNT(*) FROM uncle_grooming.events;
-- ============================================================
