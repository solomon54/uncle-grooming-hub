/**
 * @file CtaBanner.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

export function CtaBanner() {
  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .cta-section { padding: 72px 20px !important; }
          .cta-eyebrow { font-size: 10px !important; margin-bottom: 14px !important; }
          .cta-h2 { font-size: 30px !important; margin-bottom: 14px !important; }
          .cta-sub { font-size: 13px !important; margin-bottom: 28px !important; }
          .cta-btn { width: 100% !important; justify-content: center !important; font-size: 14px !important; padding: 14px 20px !important; }
        }
      `}</style>
      <section className="cta-section section-divider" style={{ position: "relative", padding: "100px 24px", overflow: "hidden", background: "#171d22" }} aria-label="Call to action">
        <div style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=60&auto=format&fit=crop" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.09 }} loading="lazy" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #171d22, transparent 30%, transparent 70%, #171d22)" }} />
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, #e2d609, transparent)" }} aria-hidden="true" />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, #e2d609, transparent)" }} aria-hidden="true" />
        <div style={{ position: "relative", zIndex: 10, maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
          <AnimateIn>
            <span className="cta-eyebrow" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "18px" }}>Ready?</span>
            <h2 className="cta-h2" style={{ fontSize: "clamp(30px, 6.5vw, 72px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.0, marginBottom: "18px" }}>
              Your chair is <span style={{ color: "#e2d609" }}>waiting.</span>
            </h2>
            <p className="cta-sub" style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.65, marginBottom: "32px", maxWidth: "400px", margin: "0 auto 32px" }}>
              Reserve your spot now. No account needed — just your name and your preferred barber.
            </p>
            <Link href="/reserve" className="cta-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "15px 36px", borderRadius: "9999px", background: "#e2d609", color: "#0f1317", fontSize: "15px", fontWeight: 900, textDecoration: "none", boxShadow: "0 0 52px rgba(226,214,9,0.32)", boxSizing: "border-box" }}>
              Reserve Now — {"It's"} Free →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
