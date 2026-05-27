/**
 * @file pusher.server.ts
 * @module core/realtime
 *
 * Pusher Server Client — triggers real-time events from API routes.
 *
 * Specification: MODULE_PRIORITY.md P4.4
 *
 * Used by:
 *   - /api/sync/push — after each event batch is committed, triggers
 *     the appropriate Pusher channels so connected clients update instantly
 *
 * Channel naming convention:
 *   queue-token-{TOKEN}   — customer tracking page for a specific token
 *   shop-queue            — cashier + status board (all queue changes)
 *   barber-lane-{LANE_ID} — barber dashboard for a specific lane
 *
 * Environment variables required (add to .env.local):
 *   PUSHER_APP_ID
 *   PUSHER_KEY
 *   PUSHER_SECRET
 *   PUSHER_CLUSTER
 *
 * Free tier: 200,000 messages/day, 100 simultaneous connections.
 * Sufficient for a single shop. Upgrade to Pusher Starter ($49/mo) at scale.
 */

import Pusher from "pusher";

// ─── Singleton ────────────────────────────────────────────────────────────────

let _pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (_pusherServer) return _pusherServer;

  const appId   = process.env.PUSHER_APP_ID;
  const key     = process.env.PUSHER_KEY;
  const secret  = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "mt1";

  if (!appId || !key || !secret) {
    // Return a no-op stub when env vars not configured (dev without Pusher)
    return createStubPusher();
  }

  _pusherServer = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return _pusherServer;
}

// ─── Channel helpers ──────────────────────────────────────────────────────────

export const PUSHER_CHANNELS = {
  /** All queue changes — cashier + status board */
  shopQueue:    "shop-queue",
  /** Per-customer tracking page */
  queueToken:   (token: string) => `queue-token-${token}`,
  /** Per-barber lane dashboard */
  barberLane:   (laneId: string) => `barber-lane-${laneId}`,
} as const;

export const PUSHER_EVENTS = {
  queueUpdated:    "queue.updated",
  customerCalled:  "customer.called",
  serviceStarted:  "service.started",
  serviceComplete: "service.complete",
  paymentReady:    "payment.ready",
  paymentSettled:  "payment.settled",
} as const;

// ─── Trigger helpers ──────────────────────────────────────────────────────────

/**
 * Trigger a queue update on all relevant channels for a given event type.
 * Called from /api/sync/push after batch is committed.
 */
export async function triggerQueueEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const pusher = getPusherServer();

  // Always notify the shop-wide queue channel
  await pusher.trigger(PUSHER_CHANNELS.shopQueue, PUSHER_EVENTS.queueUpdated, payload);

  // Notify specific customer tracking channel if token present
  if (payload.queue_token && typeof payload.queue_token === "string") {
    const channel = PUSHER_CHANNELS.queueToken(payload.queue_token);

    if (eventType === "CUSTOMER_CALLED_TO_CHAIR") {
      await pusher.trigger(channel, PUSHER_EVENTS.customerCalled, payload);
    } else if (eventType === "SERVICE_ENGAGED") {
      await pusher.trigger(channel, PUSHER_EVENTS.serviceStarted, payload);
    } else if (eventType === "SERVICE_COMPLETED") {
      await pusher.trigger(channel, PUSHER_EVENTS.serviceComplete, payload);
    } else if (eventType === "PAYMENT_INTENT_CREATED") {
      await pusher.trigger(channel, PUSHER_EVENTS.paymentReady, payload);
    } else if (eventType === "PAYMENT_SETTLED") {
      await pusher.trigger(channel, PUSHER_EVENTS.paymentSettled, payload);
    } else {
      await pusher.trigger(channel, PUSHER_EVENTS.queueUpdated, payload);
    }
  }

  // Notify barber lane channel if barber_id present
  if (payload.barber_id && typeof payload.barber_id === "string") {
    await pusher.trigger(
      PUSHER_CHANNELS.barberLane(payload.barber_id),
      PUSHER_EVENTS.queueUpdated,
      payload
    );
  }
}

// ─── No-op stub (when Pusher not configured) ──────────────────────────────────

function createStubPusher(): Pusher {
  return {
    trigger: async () => { console.log("[Pusher] Not configured — skipping trigger"); },
  } as unknown as Pusher;
}
