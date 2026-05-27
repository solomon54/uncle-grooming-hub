/**
 * @file usePusherChannel.ts
 * @module ui/hooks
 *
 * usePusherChannel — subscribe to a Pusher channel and listen for events.
 *
 * Specification: MODULE_PRIORITY.md P5.6
 *
 * Subscribes on mount, unsubscribes on unmount.
 * Gracefully handles missing Pusher config (no-op when not configured).
 *
 * Usage:
 *   usePusherChannel("queue-token-A-07", "queue.updated", (data) => {
 *     // data is the event payload from the server
 *   });
 */

"use client";

import { useEffect, useRef } from "react";
import { getPusherClient }   from "@/core/realtime/pusher.client";

export function usePusherChannel(
  channelName: string,
  eventName:   string,
  onEvent:     (data: unknown) => void
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return; // Pusher not configured — polling fallback active

    const channel = pusher.subscribe(channelName);

    const handler = (data: unknown) => {
      onEventRef.current(data);
    };

    channel.bind(eventName, handler);

    return () => {
      channel.unbind(eventName, handler);
      pusher.unsubscribe(channelName);
    };
  }, [channelName, eventName]);
}

/**
 * Subscribe to multiple events on the same channel.
 */
export function usePusherChannelMulti(
  channelName: string,
  bindings:    Record<string, (data: unknown) => void>
): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(channelName);

    const handlers: Record<string, (data: unknown) => void> = {};

    for (const [event] of Object.entries(bindings)) {
      handlers[event] = (data: unknown) => {
        bindingsRef.current[event]?.(data);
      };
      channel.bind(event, handlers[event]);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        channel.unbind(event, handler);
      }
      pusher.unsubscribe(channelName);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
}
