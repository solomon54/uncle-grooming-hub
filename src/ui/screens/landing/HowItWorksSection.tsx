/**
 * @file HowItWorksSection.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const STEPS = [
  { step: "01", title: "Reserve Your Spot", description: "Open the app from anywhere in Addis. Pick your barber, choose your service, and lock in your position in the queue — before you leave home.", image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80&auto=format&fit=crop" },
  { step: "02", title: "Track Your Queue", description: "Watch your position in real time. We'll notify you 30 minutes before your turn — so you arrive exactly on time, not a minute early.", image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80&auto=format&fit=crop" },
  { step: "03", title: "Sit Down & Be Served", description: "Walk in, get called to your barber's chair, and experience the craft. No waiting room anxiety. No wasted time.", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&auto=format&fit=crop" },
] as const;

export function HowItWorksSection() {
  return (
    <>
      <style>{`
        .hiw-card { display: grid; grid-template-columns: 1fr 1fr; border-radius: 14px; overflow: hidden; border: 1px solid #2d3840; background: #1e262d; }
        .hiw-img { position: relative; height: 250px; overflow: hidden; }
        .hiw-body { display: flex; flex-direction: column; justify-content: center; padding: 40px 44px; }
        @media (max-width: 767px) {
          .hiw-section { padding: 56px 20px !important; }
          .hiw-hdr { margin-bottom: 28px !important; }
          .hiw-h2 { font-size: 20px !important; }
          .hiw-sub { font-size: 13px !important; }
          .hiw-card { grid-template-columns: 1fr !important; }
          .hiw-img { height: 180px !important; order: 1 !important; }
          .hiw-body { padding: 20px 18px !important; order: 2 !important; }
          .hiw-body-ord-first { order: 1 !important; }
          .hiw-img-ord-last { order: 2 !important; }
          .hiw-title { font-size: 16px !important; margin-bottom: 8px !important; }
          .hiw-desc { font-size: 13px !important; line-height: 1.55 !important; }
          .hiw-step-badge { width: 32px !important; height: 32px !important; }
          .hiw-cta { font-size: 13px !important; padding: 12px 20px !important; display: block !important; text-align: center !important; }
        }
      `}</style>
      <section id="how-it-works" className="hiw-section section-divider" style={{ padding: "80px 24px", background: "#171d22" }} aria-label="How it works">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <AnimateIn>
            <div className="hiw-hdr" style={{ textAlign: "center", marginBottom: "52px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "10px" }}>The Process</span>
              <h2 className="hiw-h2" style={{ fontSize: "clamp(20px, 4vw, 42px)", fontWeight: 900, color: "#ffffff", marginBottom: "12px", lineHeight: 1.15 }}>Three Steps. Zero Friction.</h2>
              <p className="hiw-sub" style={{ color: "rgba(255,255,255,0.5)", maxWidth: "380px", margin: "0 auto", fontSize: "15px", lineHeight: 1.6 }}>
                Designed for Addis — where your time is as valuable as your style.
              </p>
            </div>
          </AnimateIn>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {STEPS.map((step, i) => (
              <AnimateIn key={step.step} delay={i * 0.1}>
                <div className="hiw-card">
                  <div
                    className={`hiw-img ${i % 2 === 1 ? "hiw-img-ord-last" : ""}`}
                    style={{ order: i % 2 === 1 ? 2 : 1 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.image} alt={step.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,23,0.28)" }} />
                    <div style={{ position: "absolute", top: "14px", left: "14px" }}>
                      <span style={{ fontSize: "56px", fontWeight: 900, color: "rgba(255,255,255,0.06)", lineHeight: 1 }}>{step.step}</span>
                    </div>
                  </div>
                  <div
                    className={`hiw-body ${i % 2 === 1 ? "hiw-body-ord-first" : ""}`}
                    style={{ order: i % 2 === 1 ? 1 : 2 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                      <div className="hiw-step-badge" style={{ width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0, background: "rgba(226,214,9,0.1)", border: "1px solid rgba(226,214,9,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 900, color: "#e2d609" }}>{step.step}</span>
                      </div>
                      <div style={{ height: "1px", flex: 1, background: "#2d3840" }} />
                    </div>
                    <h3 className="hiw-title" style={{ fontSize: "clamp(16px, 2.2vw, 26px)", fontWeight: 900, color: "#ffffff", marginBottom: "12px", lineHeight: 1.2 }}>{step.title}</h3>
                    <p className="hiw-desc" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.65, fontSize: "14px" }}>{step.description}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <AnimateIn delay={0.2}>
            <div style={{ textAlign: "center", marginTop: "44px" }}>
              <Link href="/reserve" className="hiw-cta" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "13px 28px", borderRadius: "9999px", border: "2px solid #e2d609", color: "#e2d609", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}>
                Start Now — Reserve Your Spot →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
