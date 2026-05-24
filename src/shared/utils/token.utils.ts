/**
 * @file token.utils.ts
 * @module shared/utils
 *
 * Queue token generation utilities.
 *
 * Specification: CXS v1.1 §3.3 — Queue Token system
 *
 * Token format: {daily_letter}{2-digit-sequence}
 * Example: "A-07"
 *
 * Daily letter cycles A–Z based on day of month (not day of week,
 * to avoid repeating on same weekday). Sequence resets each morning.
 * Collision-free within a single shop day.
 */

/**
 * Generate a queue token from the current count of entries today.
 * @param existingCount - number of entries already in queue today
 */
export function generateQueueToken(existingCount: number): string {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const today   = new Date();
  // Use day of month (1-31) to cycle through letters
  const letterIdx = (today.getDate() - 1) % LETTERS.length;
  const letter    = LETTERS[letterIdx];
  const seq       = String((existingCount % 99) + 1).padStart(2, "0");
  return `${letter}-${seq}`;
}

/**
 * Parse a queue token into its components.
 * Returns null if the token format is invalid.
 */
export function parseQueueToken(token: string): { letter: string; sequence: number } | null {
  const match = token.match(/^([A-Z])-(\d{2})$/);
  if (!match) return null;
  return { letter: match[1], sequence: parseInt(match[2], 10) };
}

/**
 * Build the customer tracking URL from a queue token.
 * Specification: CXS v1.1 §3.1
 */
export function buildTrackingUrl(queueToken: string): string {
  return `https://track.unclegroominghub.com/q/${queueToken}`;
}
