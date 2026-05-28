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
    <>
      <style>{`
        @media (max-width: 767px) {
          .hiw-card { grid-template-columns: 1fr !important; }
          .hiw-image { height: 220px !important; order: 1 !important; }
          .hiw-content { padding: 28px 24px !important; order: 2 !important; }
        }
      `}</style>
      <section
        id="how-it-works"
        className="section-divider"
        style={{ padding: "80px 24px", background: "#171d22" }}
        aria-label="How it works"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          <AnimateIn>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "14px" }}>
                The Process
              </span>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#ffffff", marginBottom: "16px", lineHeight: 1.15 }}>
                Three Steps. Zero Friction.
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: "420px", margin: "0 auto", fontSize: "16px", lineHeight: 1.7 }}>
                Designed for Addis — where your time is as valuable as your style.
              </p>
            </div>
          </AnimateIn>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {STEPS.map((step, i) => (
              <AnimateIn key={step.step} delay={i * 0.1}>
                <div
                  className="hiw-card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid #2d3840",
                    background: "#1e262d",
                  }}
                >
                  {/* Image */}
                  <div
                    className="hiw-image"
                    style={{
                      position: "relative",
                      height: "260px",
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
                    <div style={{ position: "absolute", top: "16px", left: "16px" }}>
                      <span style={{ fontSize: "64px", fontWeight: 900, color: "rgba(255,255,255,0.07)", lineHeight: 1 }}>
                        {step.step}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className="hiw-content"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: "40px 44px",
                      order: i % 2 === 1 ? 1 : 2,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                      <div style={{
                        width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                        background: "rgba(226,214,9,0.1)", border: "1px solid rgba(226,214,9,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: "12px", fontWeight: 900, color: "#e2d609" }}>{step.step}</span>
                      </div>
                      <div style={{ height: "1px", flex: 1, background: "#2d3840" }} />
                    </div>
                    <h3 style={{ fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 900, color: "#ffffff", marginBottom: "14px", lineHeight: 1.2 }}>
                      {step.title}
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontSize: "14px" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <AnimateIn delay={0.2}>
            <div style={{ textAlign: "center", marginTop: "48px" }}>
              <Link
                href="/reserve"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "15px 32px", borderRadius: "9999px",
                  border: "2px solid #e2d609", color: "#e2d609",
                  fontSize: "15px", fontWeight: 700, textDecoration: "none",
                }}
              >
                Start Now — Reserve Your Spot →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
