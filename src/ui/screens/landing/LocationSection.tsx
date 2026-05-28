/**
 * @file LocationSection.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

export function LocationSection() {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .location-grid { grid-template-columns: 1fr !important; }
          .location-map { min-height: 280px !important; }
        }
      `}</style>
      <section
        id="location"
        className="section-divider"
        style={{ padding: "80px 24px", background: "#171d22" }}
        aria-label="Location"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          <AnimateIn>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "14px" }}>
                Find Us
              </span>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
                {"We're in Bole, Addis Ababa."}
              </h2>
            </div>
          </AnimateIn>

          <div
            className="location-grid"
            style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "24px", alignItems: "stretch" }}
          >
            {/* Info cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                {
                  icon: "📍",
                  title: "Address",
                  lines: ["Bole, Addis Ababa", "Ethiopia"],
                  action: { label: "Open in Maps →", href: "https://maps.google.com/?q=Bole,Addis+Ababa" },
                },
                {
                  icon: "🕐",
                  title: "Hours",
                  lines: ["Every Day", "8:00 AM – 8:00 PM"],
                  action: null,
                },
                {
                  icon: "📞",
                  title: "Contact",
                  lines: ["Coming soon"],
                  action: null,
                },
              ].map(({ icon, title, lines, action }, i) => (
                <AnimateIn key={title} delay={i * 0.08}>
                  <div style={{
                    display: "flex", gap: "14px", padding: "18px",
                    borderRadius: "14px", background: "#0f1317",
                    border: "1px solid #2d3840",
                    alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0,
                      background: "rgba(226,214,9,0.08)", border: "1px solid rgba(226,214,9,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px",
                    }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>
                        {title}
                      </div>
                      {lines.map(l => (
                        <div key={l} style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>{l}</div>
                      ))}
                      {action && (
                        <a
                          href={action.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "12px", color: "#e2d609", textDecoration: "none", display: "inline-block", marginTop: "6px" }}
                        >
                          {action.label}
                        </a>
                      )}
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>

            {/* Map placeholder */}
            <AnimateIn delay={0.15}>
              <a
                href="https://maps.google.com/?q=Bole,Addis+Ababa"
                target="_blank"
                rel="noopener noreferrer"
                className="location-map"
                style={{
                  display: "block", width: "100%", minHeight: "340px",
                  borderRadius: "16px", border: "1px solid #2d3840",
                  overflow: "hidden", position: "relative", textDecoration: "none",
                }}
                aria-label="Open location in Google Maps"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=900&q=80&auto=format&fit=crop"
                  alt="Map placeholder"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.3, position: "absolute", inset: 0 }}
                  loading="lazy"
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(23,29,34,0.8), transparent)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
                  <div style={{
                    width: "52px", height: "52px", borderRadius: "50%",
                    background: "rgba(226,214,9,0.15)", border: "2px solid rgba(226,214,9,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                  }}>
                    📍
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#ffffff", fontWeight: 600, fontSize: "14px" }}>Bole, Addis Ababa</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "4px" }}>Click to open in Google Maps</div>
                  </div>
                </div>
                <div style={{
                  position: "absolute", bottom: "14px", right: "14px",
                  padding: "6px 12px", borderRadius: "9999px",
                  background: "rgba(15,19,23,0.8)", border: "1px solid #2d3840",
                  fontSize: "12px", color: "rgba(255,255,255,0.5)",
                }}>
                  Google Maps →
                </div>
              </a>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
