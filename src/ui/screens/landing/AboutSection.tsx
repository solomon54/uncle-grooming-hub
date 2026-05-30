/**
 * @file AboutSection.tsx
 * @module ui/screens/landing
 *
 * Mobile: text first, then 2-col gallery. Desktop: side-by-side.
 */
"use client";
import React from "react";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const GALLERY = [
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=75&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=75&auto=format&fit=crop",
];

const STATS = [
  { value: "3",   label: "Expert Barbers" },
  { value: "6+",  label: "Services" },
  { value: "Gerji", label: "Addis Ababa" },
];

export function AboutSection() {
  return (
    <>
      <style>{`
        .ab-layout { display: flex; flex-direction: column; gap: 32px; }
        .ab-gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .ab-gallery-item { border-radius: 10px; overflow: hidden; border: 1px solid #2d3840; aspect-ratio: 1/1; position: relative; }
        .ab-gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ab-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #2d3840; }

        @media (min-width: 768px) {
          .ab-layout { flex-direction: row; align-items: center; gap: 72px; }
          .ab-text { flex: 1; }
          .ab-gallery-wrap { flex: 1; }
          .ab-gallery { grid-template-columns: 1fr 1fr; gap: 10px; }
          .ab-gallery-item:first-child { grid-row: span 2; aspect-ratio: 3/4; }
          .ab-stats { gap: 20px; margin-top: 32px; padding-top: 32px; }
        }
      `}</style>

      <section id="about" style={{ padding: "clamp(40px,6vw,80px) clamp(16px,4vw,24px)", background: "#0f1317" }} aria-label="About">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div className="ab-layout">
            <AnimateIn>
              <div className="ab-text">
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "12px" }}>The Philosophy</span>
                <h2 style={{ fontSize: "clamp(22px,3.5vw,46px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "20px" }}>
                  Grooming is a <span style={{ color: "#e2d609" }}>ritual</span>,<br />not a transaction.
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "rgba(255,255,255,0.6)", fontSize: "clamp(13px,1.4vw,14px)", lineHeight: 1.75 }}>
                  <p>In Addis Ababa, the barbershop has always been more than a place to get a cut. It's where conversations happen, where style is defined, where a man walks out feeling like himself again.</p>
                  <p>Dove Barber was built to honor that tradition — and elevate it. Premium tools, skilled hands, and a system designed to respect your time in a city that never stops moving.</p>
                </div>
                <div className="ab-stats">
                  {STATS.map(({ value, label }) => (
                    <div key={label}>
                      <div style={{ fontSize: "clamp(18px,2.5vw,22px)", fontWeight: 900, color: "#e2d609", marginBottom: "3px" }}>{value}</div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>

            <AnimateIn delay={0.12}>
              <div className="ab-gallery-wrap">
                <div className="ab-gallery">
                  {GALLERY.map((src, i) => (
                    <div key={src} className="ab-gallery-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" loading="lazy" />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,23,0.1)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
