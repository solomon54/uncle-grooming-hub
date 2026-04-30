/**
 * @file HowItWorksSection.tsx
 * @module ui/screens/landing
 */

"use client";

import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const STEPS = [
  {
    step: "01",
    title: "Reserve Your Spot",
    description: "Open the app from anywhere in Addis. Pick your barber, choose your service, and lock in your position in the queue — before you leave home.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80&auto=format&fit=crop",
  },
  {
    step: "02",
    title: "Track Your Queue",
    description: "Watch your position in real time. We'll notify you when you're 30 minutes away from the chair — so you arrive exactly on time, not a minute early.",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80&auto=format&fit=crop",
  },
  {
    step: "03",
    title: "Sit Down & Be Served",
    description: "Walk in, get called to your barber's chair, and experience the craft. No waiting room anxiety. No wasted time. Just the cut you came for.",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&auto=format&fit=crop",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="section-divider"
      style={{ padding: "96px 24px", background: "#171d22" }}
      aria-label="How it works"
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <AnimateIn>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "16px" }}>
              The Process
            </span>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "#ffffff", marginBottom: "20px", lineHeight: 1.1 }}>
              Three Steps. Zero Friction.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: "480px", margin: "0 auto", fontSize: "17px", lineHeight: 1.7 }}>
              Designed for Addis — where your time is as valuable as your style.
            </p>
          </div>
        </AnimateIn>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {STEPS.map((step, i) => (
            <AnimateIn key={step.step} delay={i * 0.12}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid #2d3840",
                  background: "#1e262d",
                }}
              >
                {/* Image — alternates sides */}
                <div
                  style={{
                    position: "relative",
                    height: "280px",
                    overflow: "hidden",
                    order: i % 2 === 1 ? 2 : 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={step.image}
                    alt={step.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                  />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,23,0.3)" }} />
                  <div style={{ position: "absolute", top: "20px", left: "20px" }}>
                    <span style={{ fontSize: "72px", fontWeight: 900, color: "rgba(255,255,255,0.08)", lineHeight: 1 }}>
                      {step.step}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "48px",
                    order: i % 2 === 1 ? 1 : 2,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "10px",
                      background: "rgba(226,214,9,0.1)", border: "1px solid rgba(226,214,9,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: "13px", fontWeight: 900, color: "#e2d609" }}>{step.step}</span>
                    </div>
                    <div style={{ height: "1px", flex: 1, background: "#2d3840" }} />
                  </div>
                  <h3 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 900, color: "#ffffff", marginBottom: "16px", lineHeight: 1.2 }}>
                    {step.title}
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontSize: "15px" }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>

        {/* CTA */}
        <AnimateIn delay={0.2}>
          <div style={{ textAlign: "center", marginTop: "56px" }}>
            <Link
              href="/reserve"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "16px 36px", borderRadius: "9999px",
                border: "2px solid #e2d609", color: "#e2d609",
                fontSize: "15px", fontWeight: 700, textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              Start Now — Reserve Your Spot →
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
