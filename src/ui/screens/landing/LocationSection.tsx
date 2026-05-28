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
        .loc-grid { display: grid; grid-template-columns: 2fr 3fr; gap: 24px; align-items: stretch; }
        @media (max-width: 767px) {
          .loc-section { padding: 56px 20px !important; }
          .loc-hdr { margin-bottom: 28px !important; }
          .loc-h2 { font-size: 20px !important; }
          .loc-grid { grid-template-columns: 1fr !important; }
          .loc-map { min-height: 220px !important; }
          .loc-card { padding: 14px !important; gap: 12px !important; }
          .loc-icon { width: 36px !important; height: 36px !important; font-size: 15px !important; }
          .loc-title { font-size: 9px !important; }
          .loc-line { font-size: 13px !important; }
          .loc-link { font-size: 11px !important; }
        }
      `}</style>
      <section id="location" className="loc-section section-divider" style={{ padding: "80px 24px", background: "#171d22" }} aria-label="Location">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <AnimateIn>
            <div className="loc-hdr" style={{ textAlign: "center", marginBottom: "52px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "10px" }}>Find Us</span>
              <h2 className="loc-h2" style={{ fontSize: "clamp(20px, 4.5vw, 50px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>{"We're in Bole, Addis Ababa."}</h2>
            </div>
          </AnimateIn>
          <div className="loc-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { icon: "📍", title: "Address", lines: ["Bole, Addis Ababa", "Ethiopia"], action: { label: "Open in Maps →", href: "https://maps.google.com/?q=Bole,Addis+Ababa" } },
                { icon: "🕐", title: "Hours", lines: ["Every Day", "8:00 AM – 8:00 PM"], action: null },
                { icon: "📞", title: "Contact", lines: ["Coming soon"], action: null },
              ].map(({ icon, title, lines, action }, i) => (
                <AnimateIn key={title} delay={i * 0.07}>
                  <div className="loc-card" style={{ display: "flex", gap: "13px", padding: "16px", borderRadius: "13px", background: "#0f1317", border: "1px solid #2d3840", alignItems: "flex-start" }}>
                    <div className="loc-icon" style={{ width: "40px", height: "40px", borderRadius: "9px", flexShrink: 0, background: "rgba(226,214,9,0.08)", border: "1px solid rgba(226,214,9,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{icon}</div>
                    <div>
                      <div className="loc-title" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: "3px" }}>{title}</div>
                      {lines.map(l => <div key={l} className="loc-line" style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{l}</div>)}
                      {action && <a href={action.href} target="_blank" rel="noopener noreferrer" className="loc-link" style={{ fontSize: "12px", color: "#e2d609", textDecoration: "none", display: "inline-block", marginTop: "5px" }}>{action.label}</a>}
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>
            <AnimateIn delay={0.12}>
              <a href="https://maps.google.com/?q=Bole,Addis+Ababa" target="_blank" rel="noopener noreferrer" className="loc-map" style={{ display: "block", width: "100%", minHeight: "320px", borderRadius: "14px", border: "1px solid #2d3840", overflow: "hidden", position: "relative", textDecoration: "none" }} aria-label="Open location in Google Maps">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=900&q=80&auto=format&fit=crop" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.28, position: "absolute", inset: 0 }} loading="lazy" />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(23,29,34,0.8), transparent)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "13px" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(226,214,9,0.15)", border: "2px solid rgba(226,214,9,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📍</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#ffffff", fontWeight: 600, fontSize: "14px" }}>Bole, Addis Ababa</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "3px" }}>Tap to open in Google Maps</div>
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: "12px", right: "12px", padding: "5px 11px", borderRadius: "9999px", background: "rgba(15,19,23,0.8)", border: "1px solid #2d3840", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Google Maps →</div>
              </a>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
