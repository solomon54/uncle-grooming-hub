/**
 * @file TrackingScreen.tsx
 * @module ui/screens
 *
 * Customer Tracking Screen — the digital ticket.
 *
 * Specification: CXS v1.1 §3.1 — What the Customer Sees on Their Own Device
 *
 * Shows:
 *   - Queue token (large, prominent)
 *   - Position in queue
 *   - Preferred barber + their status
 *   - Estimated wait (range, never precise)
 *   - Currently serving token
 *   - Service list
 *   - Cancel button (before EVENT 04 only)
 *
 * No login required. Reads from QueueBoardView + BarberLaneState projections.
 * Polling every 30s (Pusher real-time in Phase 4.4).
 *
 * Privacy: shows ONLY this customer's data. No other customers visible.
 */

"use client";

import React, { useEffect, useState } from "react";
import Link                            from "next/link";
import { useQueueBoard }               from "@/ui/hooks/useQueueBoard";
import { useBarberLane }               from "@/ui/hooks/useBarberLane";
import { usePusherChannelMulti }       from "@/ui/hooks/usePusherChannel";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "@/core/realtime/pusher.server";
import { hlcToElapsedMinutes, formatWaitEstimate } from "@/shared/utils/hlc.utils";
import type { QueueEntryView }         from "@/projections/queue-board.view";
import type { BarberLaneView }         from "@/projections/barber-lane.view";

// ─── Service catalog (matches CashierScreen) ──────────────────────────────────

const SERVICE_NAMES: Record<string, string> = {
  classic_cut:  "Classic Cut",
  premium_cut:  "Premium Cut",
  beard_groom:  "Beard Grooming",
  cut_beard:    "Cut & Beard Combo",
  head_shave:   "Head Shave",
  kids_cut:     "Kids Cut",
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  WAITING: {
    color:   "#3b82f6",
    bg:      "rgba(59,130,246,0.1)",
    border:  "rgba(59,130,246,0.25)",
    label:   "Waiting",
    label_am:"በጥበቃ ላይ",
  },
  RESERVED: {
    color:   "#8b5cf6",
    bg:      "rgba(139,92,246,0.1)",
    border:  "rgba(139,92,246,0.25)",
    label:   "Reserved",
    label_am:"ቦታ ተይዟል",
  },
  CALLED: {
    color:   "#f59e0b",
    bg:      "rgba(245,158,11,0.1)",
    border:  "rgba(245,158,11,0.25)",
    label:   "Called to Chair",
    label_am:"ወንበር ተጠርቷል",
  },
  IN_SERVICE: {
    color:   "#10b981",
    bg:      "rgba(16,185,129,0.1)",
    border:  "rgba(16,185,129,0.25)",
    label:   "In Service",
    label_am:"አገልግሎት ላይ",
  },
  EXPIRED: {
    color:   "#6b7280",
    bg:      "rgba(107,114,128,0.1)",
    border:  "rgba(107,114,128,0.25)",
    label:   "Expired",
    label_am:"ጊዜ አልፏል",
  },
  CANCELLED: {
    color:   "#6b7280",
    bg:      "rgba(107,114,128,0.1)",
    border:  "rgba(107,114,128,0.25)",
    label:   "Cancelled",
    label_am:"ተሰርዟል",
  },
} as const;

// ─── Barber status dot ────────────────────────────────────────────────────────

function BarberDot({ status }: { status: BarberLaneView["status"] }) {
  const color = {
    AVAILABLE:  "#10b981",
    CALLED:     "#f59e0b",
    IN_SERVICE: "#10b981",
    ON_BREAK:   "#6b7280",
    OFFLINE:    "#374151",
  }[status] ?? "#374151";

  return (
    <span style={{
      display: "inline-block",
      width: "8px", height: "8px",
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
    }} />
  );
}

// ─── Not Found state ──────────────────────────────────────────────────────────

function NotFound({ token }: { token: string }) {
  return (
    <div style={{
      minHeight: "100dvh", background: "#0f1317",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px", textAlign: "center",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
      <h1 style={{ fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 800, color: "#f5f5f5", marginBottom: "8px" }}>
        Ticket not found
      </h1>
      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
        Token <span style={{ color: "#e2d609", fontWeight: 700 }}>{token}</span> is not in the active queue.
      </p>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", marginBottom: "24px" }}>
        It may have expired or already been served.
      </p>
      <Link href="/status" style={{
        padding: "12px 24px", borderRadius: "9999px",
        background: "#e2d609", color: "#0f1317",
        fontSize: "14px", fontWeight: 800, textDecoration: "none",
      }}>
        View Live Queue →
      </Link>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface TrackingScreenProps {
  token: string;
}

export default function TrackingScreen({ token }: TrackingScreenProps) {
  const { view: queue }  = useQueueBoard();
  const { view: lanes }  = useBarberLane();
  const [locale, setLocale] = useState<"en" | "am">("en");
  const [, setTick] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // ── Pusher real-time subscription ──────────────────────────────────────────
  // Subscribes to this customer's personal channel.
  // Falls back to 30s polling when Pusher not configured.
  usePusherChannelMulti(
    PUSHER_CHANNELS.queueToken(token),
    {
      [PUSHER_EVENTS.queueUpdated]:   () => setTick(n => n + 1),
      [PUSHER_EVENTS.customerCalled]: () => {
        setTick(n => n + 1);
        setNotification(locale === "en"
          ? "It's your turn! Come to the chair. 🪒"
          : "ተራዎ ደርሷል! ወንበሩ ጋር ይምጡ። 🪒");
        // Web Push notification (if permission granted)
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Dove Barber", {
            body: "It's your turn! Your barber is ready.",
            icon: "/favicon.ico",
          });
        }
      },
      [PUSHER_EVENTS.serviceStarted]: () => setTick(n => n + 1),
      [PUSHER_EVENTS.serviceComplete]: () => setTick(n => n + 1),
      [PUSHER_EVENTS.paymentReady]:   () => setTick(n => n + 1),
    }
  );

  // Also subscribe to shop-wide queue channel for position updates
  usePusherChannelMulti(
    PUSHER_CHANNELS.shopQueue,
    { [PUSHER_EVENTS.queueUpdated]: () => setTick(n => n + 1) }
  );

  // Polling fallback — 30s when Pusher not configured
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Request Web Push permission on mount (non-intrusive)
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      // Don't auto-request — wait for user interaction
    }
  }, []);

  if (!queue) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Loading…</div>
      </div>
    );
  }

  // Find this customer's entry across all states
  const allEntries: QueueEntryView[] = [
    ...queue.reservations,
    ...queue.entries,
    ...queue.called,
    ...queue.in_service,
  ];
  const entry = allEntries.find(e => e.queue_token === token);

  if (!entry) return <NotFound token={token} />;

  const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.WAITING;
  const barberLane = lanes?.lanes.find(l => l.barber_id === entry.preferred_barber_id);
  const elapsed    = hlcToElapsedMinutes(entry.checkin_hlc);
  const waitLabel  = entry.estimated_wait_minutes > 0
    ? formatWaitEstimate(entry.estimated_wait_minutes)
    : "Ready soon";

  // Currently serving in this barber's lane
  const currentlyServing = queue.in_service.find(
    e => e.preferred_barber_id === entry.preferred_barber_id
  );

  const isCancellable = entry.status === "WAITING" || entry.status === "RESERVED";
  const isCalled      = entry.status === "CALLED";
  const isInService   = entry.status === "IN_SERVICE";

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0f1317",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        padding: "16px 20px",
        background: "#171d22",
        borderBottom: "1px solid #2d3840",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "7px",
            background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#0f1317", fontSize: "12px", fontWeight: 900 }}>U</span>
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>
            Dove Barber
          </span>
        </div>
        <button
          onClick={() => setLocale(l => l === "en" ? "am" : "en")}
          style={{
            padding: "5px 12px", borderRadius: "6px",
            background: "transparent", border: "1px solid #2d3840",
            color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 600,
            cursor: "pointer",
          }}
          aria-label="Toggle language"
        >
          {locale === "en" ? "አማ" : "EN"}
        </button>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <div style={{ maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ── Real-time notification banner ────────────────────────────── */}
          {notification && (
            <div style={{
              padding: "14px 16px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
            }}>
              <span style={{ fontSize: "14px", color: "#f59e0b", fontWeight: 600 }}>
                {notification}
              </span>
              <button
                onClick={() => setNotification(null)}
                style={{ background: "none", border: "none", color: "rgba(245,158,11,0.5)", cursor: "pointer", fontSize: "18px", flexShrink: 0 }}
                aria-label="Dismiss"
              >×</button>
            </div>
          )}

          {/* ── Ticket card ─────────────────────────────────────────────── */}
          <div style={{
            padding: "24px",
            background: "#171d22",
            border: `1px solid ${statusCfg.border}`,
            borderRadius: "16px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>
              {locale === "en" ? "Your Ticket" : "የእርስዎ ቲኬት"}
            </p>
            <div style={{ fontSize: "clamp(48px, 15vw, 72px)", fontWeight: 900, color: "#e2d609", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {entry.queue_token}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              marginTop: "12px", padding: "5px 14px", borderRadius: "9999px",
              background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusCfg.color, display: "inline-block" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: statusCfg.color }}>
                {locale === "en" ? statusCfg.label : statusCfg.label_am}
              </span>
            </div>
          </div>

          {/* ── Called alert ────────────────────────────────────────────── */}
          {isCalled && (
            <div style={{
              padding: "16px 20px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "12px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>🪒</div>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>
                {locale === "en" ? "It's your turn!" : "ተራዎ ደርሷል!"}
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                {locale === "en"
                  ? `${barberLane?.barber_name ?? "Your barber"} is ready for you`
                  : `${barberLane?.barber_name ?? "ባርበርዎ"} ዝግጁ ነው`}
              </p>
            </div>
          )}

          {/* ── In service ──────────────────────────────────────────────── */}
          {isInService && (
            <div style={{
              padding: "16px 20px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "12px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>✂️</div>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#10b981" }}>
                {locale === "en" ? "Service in progress" : "አገልግሎት በሂደት ላይ"}
              </p>
            </div>
          )}

          {/* ── Queue position ───────────────────────────────────────────── */}
          {(entry.status === "WAITING" || entry.status === "RESERVED") && (
            <div style={{
              padding: "16px 20px",
              background: "#171d22",
              border: "1px solid #2d3840",
              borderRadius: "12px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                  {locale === "en" ? "Position" : "ቦታ"}
                </p>
                <p style={{ fontSize: "28px", fontWeight: 900, color: "#f5f5f5" }}>
                  #{entry.position}
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.4)", marginLeft: "4px" }}>
                    {locale === "en" ? "in line" : "ወረፋ"}
                  </span>
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                  {locale === "en" ? "Est. Wait" : "የሚጠበቅ ጊዜ"}
                </p>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "#e2d609" }}>
                  {waitLabel}
                </p>
              </div>
            </div>
          )}

          {/* ── Barber lane ──────────────────────────────────────────────── */}
          <div style={{
            padding: "16px 20px",
            background: "#171d22",
            border: "1px solid #2d3840",
            borderRadius: "12px",
          }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
              {locale === "en" ? "Your Barber" : "የእርስዎ ባርበር"}
            </p>
            {barberLane ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BarberDot status={barberLane.status} />
                <div>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5" }}>
                    {barberLane.barber_name}
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    {barberLane.status === "AVAILABLE"  ? (locale === "en" ? "Available" : "ዝግጁ") :
                     barberLane.status === "IN_SERVICE" ? (locale === "en" ? "With a client" : "ደንበኛ ጋር") :
                     barberLane.status === "CALLED"     ? (locale === "en" ? "Calling next" : "ቀጣዩን እየጠራ") :
                     barberLane.status === "ON_BREAK"   ? (locale === "en" ? "On break" : "እረፍት ላይ") :
                     (locale === "en" ? "Offline" : "ከስራ ውጭ")}
                  </p>
                </div>
                {currentlyServing && (
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
                      {locale === "en" ? "Now serving" : "አሁን እያገለገለ"}
                    </p>
                    <p style={{ fontSize: "16px", fontWeight: 900, color: "#10b981" }}>
                      {currentlyServing.queue_token}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
                {locale === "en" ? "Any available barber" : "ማንኛውም ዝግጁ ባርበር"}
              </p>
            )}
          </div>

          {/* ── Services ─────────────────────────────────────────────────── */}
          {entry.intents.length > 0 && (
            <div style={{
              padding: "16px 20px",
              background: "#171d22",
              border: "1px solid #2d3840",
              borderRadius: "12px",
            }}>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
                {locale === "en" ? "Your Services" : "አገልግሎቶችዎ"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {entry.intents.map(id => (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#e2d609", fontSize: "12px" }}>✦</span>
                    <span style={{ fontSize: "14px", color: "#f5f5f5" }}>
                      {SERVICE_NAMES[id] ?? id}
                    </span>
                    {entry.is_intent_locked && (
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
                        locked
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Elapsed time ─────────────────────────────────────────────── */}
          <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            {locale === "en" ? "Checked in" : "ተመዝግቧል"}{" "}
            {elapsed < 1 ? (locale === "en" ? "just now" : "አሁን ነው") : `${elapsed} min ago`}
          </p>

          {/* ── Enable notifications prompt ──────────────────────────────── */}
          {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
            <button
              onClick={() => {
                Notification.requestPermission().then(perm => {
                  if (perm === "granted") {
                    new Notification("Dove Barber", {
                      body: "You'll be notified when it's your turn.",
                      icon: "/favicon.ico",
                    });
                  }
                });
              }}
              style={{
                width: "100%", padding: "12px",
                borderRadius: "9999px",
                background: "rgba(226,214,9,0.08)",
                border: "1px solid rgba(226,214,9,0.25)",
                color: "#e2d609",
                fontSize: "13px", fontWeight: 600,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              🔔 {locale === "en" ? "Enable turn notifications" : "ማሳወቂያ አንቃ"}
            </button>
          )}

          {/* ── Cancel button ────────────────────────────────────────────── */}
          {isCancellable && (
            <div style={{ paddingTop: "8px" }}>
              <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.3)", marginBottom: "10px" }}>
                {locale === "en"
                  ? "Need to leave? Let the cashier know or cancel here."
                  : "መሄድ ያስፈልጋል? ካሸሩን ያሳውቁ ወይም እዚህ ይሰርዙ።"}
              </p>
              <button
                style={{
                  width: "100%", padding: "12px",
                  borderRadius: "9999px",
                  background: "transparent",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "rgba(239,68,68,0.7)",
                  fontSize: "14px", fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => {
                  // Phase 2: emit EVENT 20 via Cloud API
                  // For now, direct to cashier
                  alert("Please ask the cashier to cancel your spot.");
                }}
              >
                {locale === "en" ? "Cancel My Spot" : "ቦታዬን ሰርዝ"}
              </button>
            </div>
          )}

          {/* ── View status board ────────────────────────────────────────── */}
          <Link
            href="/status"
            style={{
              display: "block", textAlign: "center",
              padding: "12px", borderRadius: "9999px",
              background: "transparent",
              border: "1px solid #2d3840",
              color: "rgba(255,255,255,0.4)",
              fontSize: "13px", textDecoration: "none",
              transition: "all 0.2s",
            }}
          >
            {locale === "en" ? "View Shop Queue Board →" : "የሱቅ ወረፋ ሰሌዳ ይመልከቱ →"}
          </Link>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: "12px 20px",
        borderTop: "1px solid #2d3840",
        textAlign: "center",
        flexShrink: 0,
      }}>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
          {process.env.NEXT_PUBLIC_PUSHER_KEY
            ? (locale === "en" ? "🟢 Live updates" : "🟢 ቀጥታ ዝማኔ")
            : (locale === "en" ? "Updates every 30 seconds" : "በ30 ሰከንድ ይዘምናል")
          } · Dove Barber
        </p>
      </footer>
    </div>
  );
}
