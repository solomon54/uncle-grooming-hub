// src/ui/screens/QueueBoardScreen.tsx

"use client";

import React from "react";
import { useQueueBoard } from "@/ui/hooks/useQueueBoard";
import type { QueueEntry } from "@/core/projection/queue-board.projection";

/**
 * QueueBoardScreen
 * ----------------------------------------
 * Public Status Board UI
 *
 * Renders the materialized QueueBoardState.
 * Fully reactive via ProjectionEngine → Hook.
 */
export default function QueueBoardScreen() {
  const state = useQueueBoard();

  if (!state) {
    return (
      <div className="p-6 text-sm text-neutral-500">
        Initializing queue board…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Queue Board</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Column title="Waiting"    entries={state.waiting}    />
        <Column title="Reserved"   entries={state.reserved}   />
        <Column title="Called"     entries={state.called}     />
        <Column title="In Service" entries={state.in_service} />
      </div>
    </div>
  );
}

/**
 * Column Component
 * ----------------------------------------
 * Generic column renderer for queue sections
 */
function Column({ title, entries }: { title: string; entries: QueueEntry[] }) {
  return (
    <div className="bg-neutral-900 rounded-2xl p-4 shadow">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <QueueCard key={entry.aggregate_id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * QueueCard
 * ----------------------------------------
 * Single customer entry UI
 */
function QueueCard({ entry }: { entry: QueueEntry }) {
  return (
    <div className="bg-neutral-800 rounded-xl p-3 flex flex-col gap-1">
      <span className="font-medium">{entry.customer_name ?? "Guest"}</span>

      <span className="text-sm text-neutral-400">
        ID: {entry.customer_uuid}
      </span>

      <span className="text-sm">
        Barber: {entry.preferred_barber_id ?? "Any"}
      </span>

      <span className="text-xs text-neutral-500">
        Wait: {entry.estimated_wait_minutes} min
      </span>
    </div>
  );
}

/**
 * EmptyState
 */
function EmptyState() {
  return <div className="text-sm text-neutral-500">No entries</div>;
}
