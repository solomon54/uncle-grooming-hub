/**
 * @file ContactStrip.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

export function ContactStrip() {
  return (
    <>
      <style>{`
        .cs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; }
        @media (max-width: 767px) {
          .cs-section { padding: 52px 20px !important; }
          .cs-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .cs-brand-name { font-size: 13px !important; }
          .cs-brand-sub { font-size: 11px !important; }
          .cs-brand-desc { font-size: 13px !important; }
          .cs-links-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px 12px !important; }
          .cs-link { font-size: 13px !important; }
          .cs-hours-label { font-size: 13px !important; }
          .cs-btn { font-size: 13px !important; padding: 11px 18px !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .cs-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
      `}</style>
      <section className="cs-section section-divider" style={{ padding: "68px 24px", background: "#0f1317" }} aria-label="Contact information">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="cs-grid">
            <AnimateIn>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#0f1317", fontWeight: 900, fontSize: "14px" }}>U</span>
                </div>
                <div>
                  <div className="cs-brand-name" style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>Uncle Grooming Hub</div>
                  <div className="cs-brand-sub" style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>Premium Grooming · Addis Ababa</div>
                </div>
              </div>
              <p className="cs-brand-desc" style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, maxWidth: "260px" }}>
                Where craft meets precision. Reserve your spot and arrive exactly when it's your turn.
              </p>
            </AnimateIn>
            <AnimateIn delay={0.08}>
              <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "16px" }}>Quick Links</h3>
              <div className="cs-links-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 20px" }}>
                {[["Services", "#services"], ["How It Works", "#how-it-works"], ["About", "#about"], ["Location", "#location"], ["Live Queue", "/status"], ["Reserve", "/reserve"]].map(([label, href]) => (
                  <a key={href} href={href} className="cs-link" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </AnimateIn>
            <AnimateIn delay={0.16}>
              <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: "16px" }}>Hours</h3>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <span className="cs-hours-label" style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Every Day</span>
                <span className="cs-hours-label" style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>8:00 AM – 8:00 PM</span>
              </div>
              <Link href="/reserve" className="cs-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "12px 20px", borderRadius: "9999px", background: "#e2d609", color: "#0f1317", fontSize: "13px", fontWeight: 900, textDecoration: "none", boxShadow: "0 0 18px rgba(226,214,9,0.18)" }}>
                Reserve Now →
              </Link>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
