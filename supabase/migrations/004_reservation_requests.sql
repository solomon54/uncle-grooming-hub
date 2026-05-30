-- Migration 004: reservation_requests table
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/taqrgsafgexysnqrvzje/sql

CREATE TABLE IF NOT EXISTS uncle_grooming.reservation_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name        text NOT NULL,
  phone                text NOT NULL,
  preferred_barber_id  text,
  requested_date       date NOT NULL,
  requested_time       time NOT NULL,
  services             jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of {id, name, price_etb}
  notes                text,
  status               text NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','CONVERTED')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Index for cashier view (upcoming reservations)
CREATE INDEX IF NOT EXISTS idx_reservation_requests_date
  ON uncle_grooming.reservation_requests (requested_date, requested_time);

-- RLS: service role can read/write; anon cannot
ALTER TABLE uncle_grooming.reservation_requests ENABLE ROW LEVEL SECURITY;

-- No public access — all reads/writes go through server-side API routes
-- (service role key bypasses RLS automatically)

-- If table already exists without services column, add it:
-- ALTER TABLE uncle_grooming.reservation_requests
--   ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;
