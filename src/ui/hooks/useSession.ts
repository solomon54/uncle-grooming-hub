/**
 * @file useSession.ts
 * @module ui/hooks
 *
 * useSession — reactive hook for active operator session.
 *
 * Reads from sessionStorage via sessionService.
 * Re-evaluates on mount and when storage events fire
 * (covers multi-tab logout scenarios).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { sessionService }  from "@/core/session/session.service";
import type { ActiveSession } from "@/core/session/session.types";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setSession(sessionService.getActiveSession());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Sync across tabs — if another tab logs out, clear here too
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ugh:active_session") refresh();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return { session, loading, refresh };
}
