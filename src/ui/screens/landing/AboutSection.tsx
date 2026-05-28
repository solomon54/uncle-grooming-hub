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
        @media (max-width: 767px) {
          .about-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .about-gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .about-gallery-item-tall { grid-row: span 1 !important; aspect-ratio: 1/1 !important; }
          .about-stats { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
      <section
        id="about"
        className="section-divider"
        style={{ padding: "80px 24px", background: "#0f1317" }}
        aria-label="About"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div
            className="about-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "center" }}
          >
            {/* Text */}
            <AnimateIn>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "18px" }}>
                  The Philosophy
                </span>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "28px" }}>
                  Grooming is a{" "}
                  <span style={{ color: "#e2d609" }}>ritual</span>,<br />
                  not a transaction.
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "rgba(255,255,255,0.6)", fontSize: "15px", lineHeight: 1.8 }}>
                  <p>
                    In Addis Ababa, the barbershop has always been more than a place to get a cut. It's where conversations happen, where style is defined, where a man walks out feeling like himself again.
                  </p>
                  <p>
                    Uncle Grooming Hub was built to honor that tradition — and elevate it. Premium tools, skilled hands, and a system designed to respect your time in a city that never stops moving.
                  </p>
                  <p>
                    No chaos. No waiting in the dark. Just craft, clarity, and a chair that's ready for you when you arrive.
                  </p>
                </div>

                {/* Stats */}
                <div
                  className="about-stats"
                  style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "36px", paddingTop: "36px", borderTop: "1px solid #2d3840" }}
                >
                  {[
                    { value: "—",    label: "Expert Barbers" },
                    { value: "6+",   label: "Services"       },
                    { value: "Bole", label: "Addis Ababa"    },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <div style={{ fontSize: "24px", fontWeight: 900, color: "#e2d609", marginBottom: "4px" }}>{value}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>

            {/* Gallery */}
            <AnimateIn delay={0.15}>
              <div
                className="about-gallery"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
              >
                {GALLERY.map((src, i) => (
                  <div
                    key={src}
                    className={i === 0 ? "about-gallery-item-tall" : ""}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: "12px",
                      border: "1px solid #2d3840",
                      aspectRatio: i === 0 ? "3/4" : "1/1",
                      gridRow: i === 0 ? "span 2" : "auto",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,23,0.15)" }} />
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
