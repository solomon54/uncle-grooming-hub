/**
 * @file pin.ts
 * @module core/security
 *
 * PIN hashing and verification — production-grade.
 *
 * Specification: SOS v1.0 §6 — EVENT 28 STAFF_PIN_CHANGED
 *                TAS v1.0 §9 — Security Architecture
 *
 * Hash strategy:
 *   - Initial seed (from SQL): SHA-256(pin) via pgcrypto digest()
 *   - After first PIN change: SHA-256(pin + actor_id) for uniqueness
 *
 * Both use Web Crypto SubtleCrypto which matches pgcrypto's output exactly.
 * PINs are NEVER stored in plain text anywhere.
 */

// ─── Hash a PIN (initial seed — matches pgcrypto digest()) ───────────────────

/**
 * Hash a PIN using SHA-256.
 * Matches pgcrypto: encode(digest(pin, 'sha256'), 'hex')
 *
 * Used for: initial seed verification (before first PIN change)
 */
export async function hashPinSimple(pin: string): Promise<string> {
  const data      = new TextEncoder().encode(pin);
  const hashBuf   = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Hash a PIN with actor salt (after first change) ─────────────────────────

/**
 * Hash a PIN with actor_id salt using SHA-256.
 * Used for: all PIN changes after first login.
 * Produces unique hashes per operator even if PINs are identical.
 */
export async function hashPin(pin: string, actorId: string): Promise<string> {
  const data    = new TextEncoder().encode(pin + actorId);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Verify a PIN against stored hash ────────────────────────────────────────

/**
 * Verify a PIN against a stored hash.
 * Tries both hash strategies (simple for initial seed, salted for changed PINs).
 * Constant-time comparison to prevent timing attacks.
 */
export async function verifyPin(
  pin:        string,
  actorId:    string,
  storedHash: string
): Promise<boolean> {
  // Try salted hash first (post-first-change)
  const saltedHash = await hashPin(pin, actorId);
  if (constantTimeEqual(saltedHash, storedHash)) return true;

  // Fall back to simple hash (initial seed from SQL)
  const simpleHash = await hashPinSimple(pin);
  return constantTimeEqual(simpleHash, storedHash);
}

// ─── Constant-time string comparison ─────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
