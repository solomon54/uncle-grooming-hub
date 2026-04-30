/**
 * @file StatusBoardScreen.tsx
 * @module ui/screens
 *
 * Public Status Board — Cinema Dark ambient display.
 *
 * Specification: PRD §13.1, AMS v1.3 "Public Status Board", IMS v1.1
 *
 * Design Principles:
 *   - Passive projection consumer — emits NO events
 *   - High-contrast Cinema Dark palette for varied shop lighting
 *   - Anonymized customer display (initials only — PRD §13.1)
 *   - Bilingual support: English / Amharic (PRD §13.1)
 *   - Offline continuity — continues displaying local state during outages
 *   - Expectation stabilization — shows position, not precise minutes
 *
 * Consumes: QueueBoardState projection (Events 01, 03, 04, 05, 19, 25)
 */

"use client";

import React, { useEffect, useState } from "react";
import { useQueueBoard }              from "@/ui/hooks/useQueueBoard";
import { Badge }                      from "@/ui/components/primitives/Badge";
import { SyncIndicator }              from "@/ui/components/primitives/SyncIndicator";
import type { QueueEntry }            from "@/core/projection/queue-board.projection";
import { HybridLogicalClock }         from "@/core/clock/hlc";

// ─── Locale ───────────────────────────────────────────────────────────────────

type Locale = "en" | "am";

const STRINGS = {
  en: {
    title:       "Uncle Grooming Hub",
    tagline:     "Premium Grooming — Addis Ababa",
    waiting:     "Waiting",
    called:      "Called to Chair",
    inService:   "In Service",
    reserved:    "Reserved",
    nextUp:      "Next Up",
    anyBarber:   "Any Barber",
    noEntries:   "Queue is clear",
    localMode:   "Local Mode",
    position:    (n: number) => `#${n}`,
  },
  am: {
    title:       "አንክል ግሩሚንግ ሃብ",
    tagline:     "ፕሪሚየም ግሩሚንግ — አዲስ አበባ",
    waiting:     "በጥበቃ ላይ",
    called:      "ወንበር ተጠርቷል",
    inService:   "አገልግሎት ላይ",
    reserved:    "ቦታ ተይዟል",
    nextUp:      "ቀጣይ",
    anyBarber:   "ማንኛውም ባርበር",
    noEntries:   "ወረፋ ባዶ ነው",
    localMode:   "የአካባቢ ሁነታ",
    position:    (n: number) => `#${n}`,
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Anonymize customer name to initials (PRD §13.1 — no PII on public board)
 * "Dawit Bekele" → "D.B"
 * "Guest"        → "—"
 */
function toInitials(name?: string): string {
  if (!name || name.toLowerCase() === "guest") return "—";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join(".")
    .slice(0, 4); // max 4 chars to fit card
}

/**
 * Format HLC timestamp to a human-readable relative time
 * e.g. "12 min ago"
 */
function formatWaitTime(joinedHlc: string): string {
  try {
    const joinedAt = HybridLogicalClock.toDate(joinedHlc);
    const diffMs   = Date.now() - joinedAt.getTime();
    const diffMin  = Math.floor(diffMs / 60_000);

    if (diffMin < 1)  return "Just arrived";
    if (diffMin === 1) return "1 min";
    return `${diffMin} min`;
  } catch {
    return "—";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface QueueCardProps {
  entry:    QueueEntry;
  position: number;
  locale:   Locale;
  isNext?:  boolean;
}

function QueueCard({ entry, position, locale, isNext }: QueueCardProps) {
  const t = STRINGS[locale];

  return (
    <div
      className={[
        "relative rounded-[var(--radius-lg)] border p-4",
        "transition-all duration-[var(--duration-slow)]",
        isNext
          ? "bg-[var(--color-surface-overlay)] border-[var(--color-gold-dim)] shadow-[var(--shadow-gold)]"
          : "bg-[var(--color-surface-raised)] border-[var(--color-surface-border)]",
      ].join(" ")}
    >
      {/* Position badge */}
      <div className="absolute -top-2.5 -left-2.5">
        <span
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
            isNext
              ? "bg-[var(--color-gold-base)] text-[var(--color-text-inverse)]"
              : "bg-[var(--color-surface-muted)] text-[var(--color-text-tertiary)]",
          ].join(" ")}
        >
          {t.position(position)}
        </span>
      </div>

      {/* Next Up label */}
      {isNext && (
        <div className="mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gold-bright)]">
            {t.nextUp}
          </span>
        </div>
      )}

      {/* Initials */}
      <div
        className={[
          "text-2xl font-bold tracking-tight leading-none mb-1",
          isNext
            ? "text-[var(--color-text-primary)]"
            : "text-[var(--color-text-secondary)]",
        ].join(" ")}
      >
        {toInitials(entry.customer_name)}
      </div>

      {/* Barber preference */}
      <div className="text-xs text-[var(--color-text-tertiary)] truncate">
        {entry.preferred_barber_id
          ? `→ ${entry.preferred_barber_id}`
          : t.anyBarber}
      </div>

      {/* Wait time */}
      <div className="mt-2 text-[10px] text-[var(--color-text-tertiary)]">
        {formatWaitTime(entry.joined_hlc)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ServiceCardProps {
  entry:  QueueEntry;
  locale: Locale;
}

function ServiceCard({ entry, locale }: ServiceCardProps) {
  const t = STRINGS[locale];

  return (
    <div className="rounded-[var(--radius-lg)] border border-emerald-500/20 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="in-service" label={t.inService} size="sm" />
      </div>
      <div className="text-xl font-bold text-[var(--color-text-primary)]">
        {toInitials(entry.customer_name)}
      </div>
      <div className="text-xs text-[var(--color-text-tertiary)] mt-1 truncate">
        {entry.preferred_barber_id ?? t.anyBarber}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface CalledCardProps {
  entry:  QueueEntry;
  locale: Locale;
}

function CalledCard({ entry, locale }: CalledCardProps) {
  const t = STRINGS[locale];

  return (
    <div className="rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="called" label={t.called} size="sm" />
      </div>
      <div className="text-xl font-bold text-[var(--color-text-primary)]">
        {toInitials(entry.customer_name)}
      </div>
      <div className="text-xs text-[var(--color-text-tertiary)] mt-1 truncate">
        {entry.preferred_barber_id ?? t.anyBarber}
      </div>
    </div>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right">
      <div className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)] tracking-tight">
        {time.toLocaleTimeString("en-ET", {
          hour:   "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </div>
      <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
        {time.toLocaleDateString("en-ET", {
          weekday: "long",
          month:   "long",
          day:     "numeric",
        })}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StatusBoardScreen() {
  const state  = useQueueBoard();
  const [locale, setLocale] = useState<Locale>("en");
  const t = STRINGS[locale];

  // Tick wait times every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-void)] flex items-center justify-center">
        <div className="text-[var(--color-text-tertiary)] text-sm animate-pulse">
          Initializing…
        </div>
      </div>
    );
  }

  const { waiting, reserved, called, in_service } = state;
  const totalActive = waiting.length + reserved.length;

  return (
    <div className="min-h-screen bg-[var(--color-surface-void)] flex flex-col select-none">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[var(--color-surface-border)]">
        {/* Brand */}
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
            {t.title}
          </h1>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            {t.tagline}
          </p>
        </div>

        {/* Center — queue count */}
        <div className="flex items-center gap-3">
          {totalActive > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-surface-border)]">
              <span className="text-2xl font-bold text-[var(--color-gold-bright)] tabular-nums">
                {totalActive}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {totalActive === 1 ? "guest waiting" : "guests waiting"}
              </span>
            </div>
          )}
        </div>

        {/* Right — clock + locale toggle + sync */}
        <div className="flex items-center gap-6">
          <SyncIndicator state="verified" compact />

          {/* Locale toggle */}
          <button
            onClick={() => setLocale((l) => l === "en" ? "am" : "en")}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-gold-bright)] transition-colors px-2 py-1 rounded border border-[var(--color-surface-border)] hover:border-[var(--color-gold-dim)]"
            aria-label="Toggle language"
          >
            {locale === "en" ? "አማ" : "EN"}
          </button>

          <LiveClock />
        </div>
      </header>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">

        {/* ── Left: Active Service + Called ──────────────────────────────── */}
        <section className="col-span-4 border-r border-[var(--color-surface-border)] p-6 flex flex-col gap-4 overflow-y-auto">

          {/* In Service */}
          {in_service.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="in-service" label={t.inService} />
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {in_service.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {in_service.map((entry) => (
                  <ServiceCard key={entry.aggregate_id} entry={entry} locale={locale} />
                ))}
              </div>
            </div>
          )}

          {/* Called to Chair */}
          {called.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="called" label={t.called} />
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {called.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {called.map((entry) => (
                  <CalledCard key={entry.aggregate_id} entry={entry} locale={locale} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {in_service.length === 0 && called.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">—</p>
            </div>
          )}
        </section>

        {/* ── Right: Waiting Queue ────────────────────────────────────────── */}
        <section className="col-span-8 p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-5">
            <Badge variant="waiting" label={t.waiting} />
            {reserved.length > 0 && (
              <Badge variant="reserved" label={`${reserved.length} ${t.reserved}`} size="sm" />
            )}
          </div>

          {waiting.length === 0 && reserved.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {t.noEntries}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Waiting entries — ordered by arrival (HLC) */}
              {[...waiting]
                .sort((a, b) => a.joined_hlc.localeCompare(b.joined_hlc))
                .map((entry, index) => (
                  <QueueCard
                    key={entry.aggregate_id}
                    entry={entry}
                    position={index + 1}
                    locale={locale}
                    isNext={index === 0}
                  />
                ))}

              {/* Reserved entries — shown after waiting */}
              {[...reserved]
                .sort((a, b) => a.joined_hlc.localeCompare(b.joined_hlc))
                .map((entry, index) => (
                  <div
                    key={entry.aggregate_id}
                    className="rounded-[var(--radius-lg)] border border-violet-500/20 bg-violet-500/5 p-4"
                  >
                    <div className="mb-2">
                      <Badge variant="reserved" label={t.reserved} size="sm" />
                    </div>
                    <div className="text-xl font-bold text-[var(--color-text-primary)]">
                      {toInitials(entry.customer_name)}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-1 truncate">
                      {entry.preferred_barber_id ?? t.anyBarber}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-8 py-3 border-t border-[var(--color-surface-border)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SyncIndicator state="verified" />
        </div>

        {/* Gold accent line */}
        <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[var(--color-gold-dim)] to-transparent" />

        <div className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest">
          Uncle Grooming Hub · v1.0
        </div>
      </footer>
    </div>
  );
}
