/**
 * @file AboutSection.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const GALLERY = [
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop",
];

export function AboutSection() {
  return (
    <>
      <style>{`
        .ab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
        .ab-gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ab-gallery-tall { grid-row: span 2; aspect-ratio: 3/4; }
        .ab-gallery-sq { aspect-ratio: 1/1; }
        @media (max-width: 767px) {
          .ab-section { padding: 56px 20px !important; }
          .ab-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .ab-eyebrow { font-size: 10px !important; margin-bottom: 10px !important; }
          .ab-h2 { font-size: 22px !important; margin-bottom: 18px !important; }
          .ab-body { font-size: 13px !important; gap: 12px !important; }
          .ab-stats { grid-template-columns: repeat(3, 1fr) !important; gap: 16px !important; margin-top: 24px !important; padding-top: 24px !important; }
          .ab-stat-val { font-size: 20px !important; }
          .ab-stat-lbl { font-size: 10px !important; }
          .ab-gallery-tall { grid-row: span 1 !important; aspect-ratio: 1/1 !important; }
        }
      `}</style>
      <section id="about" className="ab-section section-divider" style={{ padding: "80px 24px", background: "#0f1317" }} aria-label="About">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="ab-grid">
            <AnimateIn>
              <div>
                <span className="ab-eyebrow" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "16px" }}>The Philosophy</span>
                <h2 className="ab-h2" style={{ fontSize: "clamp(22px, 3.5vw, 46px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "24px" }}>
                  Grooming is a <span style={{ color: "#e2d609" }}>ritual</span>,<br />not a transaction.
                </h2>
                <div className="ab-body" style={{ display: "flex", flexDirection: "column", gap: "14px", color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: 1.75 }}>
                  <p>In Addis Ababa, the barbershop has always been more than a place to get a cut. It's where conversations happen, where style is defined, where a man walks out feeling like himself again.</p>
                  <p>Uncle Grooming Hub was built to honor that tradition — and elevate it. Premium tools, skilled hands, and a system designed to respect your time in a city that never stops moving.</p>
                  <p>No chaos. No waiting in the dark. Just craft, clarity, and a chair that's ready for you when you arrive.</p>
                </div>
                <div className="ab-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "32px", paddingTop: "32px", borderTop: "1px solid #2d3840" }}>
                  {[{ value: "—", label: "Expert Barbers" }, { value: "6+", label: "Services" }, { value: "Bole", label: "Addis Ababa" }].map(({ value, label }) => (
                    <div key={label}>
                      <div className="ab-stat-val" style={{ fontSize: "22px", fontWeight: 900, color: "#e2d609", marginBottom: "3px" }}>{value}</div>
                      <div className="ab-stat-lbl" style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={0.12}>
              <div className="ab-gallery">
                {GALLERY.map((src, i) => (
                  <div key={src} className={i === 0 ? "ab-gallery-tall" : "ab-gallery-sq"} style={{ position: "relative", overflow: "hidden", borderRadius: "11px", border: "1px solid #2d3840" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,23,0.12)" }} />
                  </div>
                ))}
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
