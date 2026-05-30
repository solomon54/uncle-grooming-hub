/**
 * @file ContactStrip.tsx
 * @module ui/screens/landing
 *
 * Footer strip — logo, quick links, address + hours.
 * Uses real logo.png image.
 */
"use client";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const MAPS_LINK = "https://maps.google.com/?q=9.0167,38.8167";

export function ContactStrip() {
  return (
    <>
      <style>{`
        .cs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; }
        @media (max-width: 767px) {
          .cs-section { padding: 48px 20px !important; }
          .cs-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .cs-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
      `}</style>

      <section
        className="cs-section"
        style={{ padding: "68px 24px", background: "#0f1317", borderTop: "1px solid #2d3840" }}
        aria-label="Footer"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="cs-grid">

            {/* ── Brand ── */}
            <AnimateIn>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                {/* Real logo image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/logo.png"
                  alt="Dove Barber"
                  style={{ height: "40px", width: "auto", objectFit: "contain", display: "block", flexShrink: 0 }}
                />
                <div>
                  <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "15px", letterSpacing: "0.16em", textTransform: "uppercase", lineHeight: 1.2 }}>
                    Dove Barber
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "11px", marginTop: "2px" }}>
                    Premium Grooming · Addis Ababa
                  </div>
                </div>
              </div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: "260px" }}>
                Where craft meets precision. Reserve your spot and arrive exactly when it's your turn.
              </p>
              {/* Address */}
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.75)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📍</span> Gerji Mebrat Haile, Addis Ababa
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", paddingLeft: "20px" }}>
                  In front of Engine Hotel
                </div>
                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: "#e2d609", textDecoration: "none", paddingLeft: "20px", marginTop: "2px" }}
                >
                  Open in Maps →
                </a>
              </div>
            </AnimateIn>

            {/* ── Quick Links ── */}
            <AnimateIn delay={0.08}>
              <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "18px" }}>
                Quick Links
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                {[
                  ["Services",     "#services"],
                  ["How It Works", "#how-it-works"],
                  ["About",        "#about"],
                  ["Location",     "#location"],
                  ["Live Queue",   "/status"],
                  ["Reserve",      "/reserve"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.15s" }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </AnimateIn>

            {/* ── Hours + CTA ── */}
            <AnimateIn delay={0.16}>
              <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "18px" }}>
                Hours
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>Every Day</span>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>8:00 AM – 12:00 AM</span>
              </div>
              <div style={{ height: "1px", background: "#2d3840", marginBottom: "20px" }} />
              <Link
                href="/reserve"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "12px 22px", borderRadius: "9999px",
                  background: "#e2d609", color: "#0f1317",
                  fontSize: "13px", fontWeight: 900, textDecoration: "none",
                  boxShadow: "0 0 20px rgba(226,214,9,0.2)",
                }}
              >
                Reserve Now →
              </Link>
              <div style={{ marginTop: "14px", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                Walk-ins always welcome.
              </div>
            </AnimateIn>

          </div>

          {/* Bottom bar */}
          <div style={{ marginTop: "48px", paddingTop: "20px", borderTop: "1px solid #2d3840", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
              © {new Date().getFullYear()} Dove Barber. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: "16px" }}>
              {[["Privacy", "#"], ["Terms", "#"]].map(([label, href]) => (
                <a key={label} href={href} style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
