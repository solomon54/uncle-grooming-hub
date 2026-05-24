/**
 * @file RuntimeProviders.tsx
 * @module ui/providers
 *
 * Runtime Provider — offline-first boot sequence.
 *
 * Specification: TAS v1.0 §3 — Local Event Journal Design (Journal Replay)
 *
 * Boot sequence:
 *   1. Initialize RxDB (IndexedDB via Dexie)
 *   2. Initialize Runtime (wire journal + projection engine)
 *   3. Replay journal from last HLC cursor (state reconstitution)
 *   4. Render children once ready
 *
 * Renders a Cinema Dark loading state during boot.
 * Renders a Cinema Dark error state on failure (with retry).
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { runtime }     from "@/core/runtime/runtime";
import { getDatabase } from "@/core/db/database";

// ─── Boot States ──────────────────────────────────────────────────────────────

type BootPhase =
  | "idle"
  | "db"
  | "runtime"
  | "replay"
  | "ready"
  | "error";

const PHASE_LABELS: Record<BootPhase, string> = {
  idle:    "Starting…",
  db:      "Opening local journal…",
  runtime: "Initializing runtime…",
  replay:  "Reconstituting state…",
  ready:   "Ready",
  error:   "Boot failed",
};

// ─── Loading Screen ───────────────────────────────────────────────────────────

function BootScreen({ phase }: { phase: BootPhase }) {
  return (
    <div className="min-h-screen bg-surface-void flex flex-col items-center justify-center gap-6">
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-center">
          <span className="text-xl font-bold text-gold-base">U</span>
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
          Uncle Grooming Hub
        </span>
      </div>

      {/* Phase indicator */}
      <div className="flex flex-col items-center gap-3">
        <svg
          className="animate-spin h-5 w-5 text-gold-muted"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>

        <p className="text-sm text-text-tertiary">
          {PHASE_LABELS[phase]}
        </p>
      </div>
    </div>
  );
}

// ─── Error Screen ─────────────────────────────────────────────────────────────

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-void flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-xl font-bold">!</span>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-primary mb-1">
            System failed to start
          </p>
          <p className="text-xs text-text-tertiary">
            {message}
          </p>
        </div>

        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-md text-sm font-medium bg-surface-raised border border-surface-border text-text-primary hover:border-surface-muted transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<BootPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setError(null);
    setPhase("db");

    try {
      const db = await getDatabase();

      setPhase("runtime");
      await runtime.init(db);

      setPhase("replay");
      await runtime.replayFromStart();

      // Start background sync loop (MODULE_PRIORITY P4.1 step 5)
      runtime.startSync();

      setPhase("ready");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[RuntimeProvider] Boot failed:", err);
      setError(message);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  if (phase === "error" && error) {
    return <ErrorScreen message={error} onRetry={boot} />;
  }

  if (phase !== "ready") {
    return <BootScreen phase={phase} />;
  }

  return <>{children}</>;
}
