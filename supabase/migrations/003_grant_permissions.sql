-- ============================================================
-- Migration 003 — Grant permissions on uncle_grooming schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Grants the necessary permissions for PostgREST (anon + authenticated)
-- and the service role to access the uncle_grooming schema.
-- ============================================================

-- Grant USAGE on schema to PostgREST roles
GRANT USAGE ON SCHEMA uncle_grooming TO anon;
GRANT USAGE ON SCHEMA uncle_grooming TO authenticated;
GRANT USAGE ON SCHEMA uncle_grooming TO service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA uncle_grooming TO service_role;
GRANT SELECT ON uncle_grooming.operators TO anon;
GRANT SELECT ON uncle_grooming.operators TO authenticated;

-- Grant sequence permissions (for auto-generated IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA uncle_grooming TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA uncle_grooming TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA uncle_grooming TO authenticated;

-- Ensure future tables also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA uncle_grooming
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA uncle_grooming
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA uncle_grooming
  GRANT SELECT ON TABLES TO authenticated;

-- ============================================================
-- Verify:
-- SELECT grantee, privilege_type
-- FROM information_schema.role_schema_grants
-- WHERE schema_name = 'uncle_grooming';
-- ============================================================
