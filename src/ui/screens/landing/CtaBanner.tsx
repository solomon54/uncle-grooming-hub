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
    <section
      className="section-divider"
      style={{ position: "relative", padding: "120px 24px", overflow: "hidden", background: "#171d22" }}
      aria-label="Call to action"
    >
      {/* Background image */}
      <div style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=60&auto=format&fit=crop"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}
          loading="lazy"
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #171d22, transparent 30%, transparent 70%, #171d22)" }} />
      </div>

      {/* Gold accent lines */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, #e2d609, transparent)" }} aria-hidden="true" />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, #e2d609, transparent)" }} aria-hidden="true" />

      <div style={{ position: "relative", zIndex: 10, maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
        <AnimateIn>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "24px" }}>
            Ready?
          </span>
          <h2 style={{ fontSize: "clamp(40px, 7vw, 80px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.0, marginBottom: "24px" }}>
            Your chair is{" "}
            <span style={{ color: "#e2d609" }}>waiting.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "17px", lineHeight: 1.7, marginBottom: "40px", maxWidth: "480px", margin: "0 auto 40px" }}>
            Reserve your spot now. No account needed — just your name and your preferred barber.
          </p>
          <Link
            href="/reserve"
            style={{
              display: "inline-flex", alignItems: "center", gap: "12px",
              padding: "18px 44px", borderRadius: "9999px",
              background: "#e2d609", color: "#0f1317",
              fontSize: "16px", fontWeight: 900, textDecoration: "none",
              boxShadow: "0 0 60px rgba(226,214,9,0.35)",
              transition: "all 0.2s ease",
            }}
          >
            Reserve Now — {"It's"} Free →
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}
