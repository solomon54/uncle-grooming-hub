/**
 * @file QueueBoardScreen.tsx
 * @module ui/screens
 *
 * Queue Board — internal operational view of the full queue state.
 * Redirects to StatusBoardScreen for the public-facing display.
 *
 * This screen is used by admin/cashier for a raw queue overview.
 * For the public ambient display, see StatusBoardScreen (/status).
 */

"use client";

import React from "react";
import { useQueueBoard }  from "@/ui/hooks/useQueueBoard";
import { useSession }     from "@/ui/hooks/useSession";
import { useSyncStatus }  from "@/ui/hooks/useSyncStatus";
import { TopBar }         from "@/ui/components/shell/TopBar";
import { Badge }          from "@/ui/components/primitives/Badge";
import { SyncIndicator }  from "@/ui/components/primitives/SyncIndicator";
import type { QueueEntryView } from "@/projections/queue-board.view";

function EntryRow({ entry }: { entry: QueueEntryView }) {
  const variantMap: Record<QueueEntryView["status"], "waiting" | "reserved" | "called" | "in-service" | "neutral"> = {
    WAITING:    "waiting",
    RESERVED:   "reserved",
    CALLED:     "called",
    IN_SERVICE: "in-service",
    EXPIRED:    "neutral",
    CANCELLED:  "neutral",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 16px",
      background: "#1e262d",
      borderRadius: "10px",
      border: "1px solid #2d3840",
    }}>
      <span style={{ fontSize: "13px", fontWeight: 900, color: "#e2d609", minWidth: "48px" }}>
        {entry.queue_token || "—"}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5" }}>
          {entry.customer_display}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
          {entry.preferred_barber_name ?? entry.preferred_barber_id ?? "Any barber"}
          {entry.intents.length > 0 && ` · ${entry.intents.length} service(s)`}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        <Badge variant={variantMap[entry.status]} label={entry.status} size="sm" />
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
          ~{entry.estimated_wait_minutes}m
        </span>
      </div>
    </div>
  );
}

function Section({ title, entries, color }: {
  title:   string;
  entries: QueueEntryView[];
  color:   string;
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
        {title} ({entries.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {entries.map(e => <EntryRow key={e.queue_entry_id} entry={e} />)}
      </div>
    </div>
  );
}

export default function QueueBoardScreen() {
  const { view, isLoading } = useQueueBoard();
  const { session }         = useSession();
  const sync                = useSyncStatus();

  if (!session) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ padding: "16px 24px", borderBottom: "1px solid #2d3840", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Queue Board
          </span>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
            {view ? `${view.total_waiting} waiting` : "Loading…"}
          </p>
        </div>
        <SyncIndicator state={sync.state} pendingCount={sync.pendingCount} />
      </div>

      <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        {isLoading ? (
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Initializing queue board…</p>
        ) : (
          <>
            <Section title="In Service" entries={view?.in_service ?? []}  color="#10b981" />
            <Section title="Called"     entries={view?.called ?? []}      color="#f59e0b" />
            <Section title="Waiting"    entries={view?.entries ?? []}     color="#3b82f6" />
            <Section title="Reserved"   entries={view?.reservations ?? []} color="#8b5cf6" />

            {view && view.entries.length === 0 && view.reservations.length === 0
              && view.called.length === 0 && view.in_service.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>Queue is clear</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
