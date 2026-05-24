/**
 * @file page.tsx
 * @module app/reserve
 *
 * Customer Reservation — /reserve
 *
 * Specification: MODULE_PRIORITY.md P7.3
 *                AMS v1.3 — Remote Scheduler module
 *                CXS v1.1 §2 — Reservation flow
 *
 * STATUS: Deferred to Phase 8.
 * Requires: Cloud API (EVENT 19 is Cloud Authority Only),
 *           Supabase reservation endpoint, AvailabilityCalendar projection.
 *
 * This page is intentionally a placeholder — the landing page links here
 * and customers need a non-404 response.
 */

export default function ReservePage() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0f1317",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      textAlign: "center",
    }}>
      {/* Brand mark */}
      <div style={{
        width: "56px", height: "56px", borderRadius: "16px",
        background: "#e2d609", display: "flex",
        alignItems: "center", justifyContent: "center",
        marginBottom: "24px",
        boxShadow: "0 0 32px rgba(226,214,9,0.25)",
      }}>
        <span style={{ color: "#0f1317", fontSize: "24px", fontWeight: 900 }}>U</span>
      </div>

      <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: "#f5f5f5", marginBottom: "12px" }}>
        Online Reservations
      </h1>

      <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", maxWidth: "400px", lineHeight: 1.7, marginBottom: "32px" }}>
        Online booking is coming soon. Walk in and check in at the front desk — no wait, no hassle.
      </p>

      {/* Walk-in CTA */}
      <a
        href="/status"
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "13px 28px", borderRadius: "9999px",
          background: "#e2d609", color: "#0f1317",
          fontSize: "14px", fontWeight: 800, textDecoration: "none",
          boxShadow: "0 0 24px rgba(226,214,9,0.25)",
        }}
      >
        View Live Queue →
      </a>

      <a
        href="/"
        style={{
          display: "inline-block", marginTop: "16px",
          fontSize: "13px", color: "rgba(255,255,255,0.35)",
          textDecoration: "none",
        }}
      >
        ← Back to home
      </a>
    </div>
  );
}
