/**
 * @file idempotency.guard.ts
 * @module core/sync
 *
 * Idempotency helpers for cloud ingest — TAS §5, AGENT.md §8
 */

export function dedupeEventIds(eventIds: string[]): string[] {
  return [...new Set(eventIds)];
}

export function isDuplicateAck(
  eventId: string,
  alreadyAcked: ReadonlySet<string>
): boolean {
  return alreadyAcked.has(eventId);
}
