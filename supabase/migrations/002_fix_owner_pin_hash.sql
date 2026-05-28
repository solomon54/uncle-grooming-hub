-- ============================================================
-- Migration 002 — Fix owner PIN hash
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Updates Solomon's PIN hash to use SHA-256 (digest) instead of HMAC.
-- This matches what the Web Crypto API produces in the browser.
-- ============================================================

UPDATE uncle_grooming.operators
SET
  pin_hash       = encode(digest('000000', 'sha256'), 'hex'),
  is_first_login = true,
  updated_at     = NOW()
WHERE actor_id = 'actor_owner_solomon';

-- Verify:
-- SELECT actor_id, email, name, is_first_login,
--        LEFT(pin_hash, 16) || '...' AS pin_hash_preview
-- FROM uncle_grooming.operators
-- WHERE actor_id = 'actor_owner_solomon';
