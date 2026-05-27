/**
 * @file pusher.client.ts
 * @module core/realtime
 *
 * Pusher Browser Client — singleton for client-side subscriptions.
 *
 * Specification: MODULE_PRIORITY.md P4.4
 *
 * Used by usePusherChannel hook to subscribe to real-time events.
 * Lazy-initialized on first use (safe for SSR).
 *
 * Environment variables required (add to .env.local):
 *   NEXT_PUBLIC_PUSHER_KEY
 *   NEXT_PUBLIC_PUSHER_CLUSTER
 */

import PusherJs from "pusher-js";

// ─── Singleton ────────────────────────────────────────────────────────────────

let _pusherClient: PusherJs | null = null;

export function getPusherClient(): PusherJs | null {
  if (typeof window === "undefined") return null;
  if (_pusherClient) return _pusherClient;

  const key     = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1";

  if (!key) {
    console.warn("[Pusher] NEXT_PUBLIC_PUSHER_KEY not set — real-time disabled");
    return null;
  }

  _pusherClient = new PusherJs(key, {
    cluster,
    forceTLS: true,
  });

  return _pusherClient;
}

export function disconnectPusherClient(): void {
  if (_pusherClient) {
    _pusherClient.disconnect();
    _pusherClient = null;
  }
}
