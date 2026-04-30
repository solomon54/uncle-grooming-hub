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
    <section
      id="about"
      className="section-divider"
      style={{ padding: "96px 24px", background: "#0f1317" }}
      aria-label="About"
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>

          {/* Text */}
          <AnimateIn>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "20px" }}>
                The Philosophy
              </span>
              <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "32px" }}>
                Grooming is a{" "}
                <span style={{ color: "#e2d609" }}>ritual</span>,<br />
                not a transaction.
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "rgba(255,255,255,0.6)", fontSize: "16px", lineHeight: 1.8 }}>
                <p>
                  In Addis Ababa, the barbershop has always been more than a place
                  to get a cut. It's where conversations happen, where style is
                  defined, where a man walks out feeling like himself again.
                </p>
                <p>
                  Uncle Grooming Hub was built to honor that tradition — and
                  elevate it. Premium tools, skilled hands, and a system designed
                  to respect your time in a city that never stops moving.
                </p>
                <p>
                  No chaos. No waiting in the dark. Just craft, clarity, and a
                  chair that's ready for you when you arrive.
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginTop: "40px", paddingTop: "40px", borderTop: "1px solid #2d3840" }}>
                {[
                  { value: "—",    label: "Expert Barbers" },
                  { value: "6+",   label: "Services"       },
                  { value: "Bole", label: "Addis Ababa"    },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <div style={{ fontSize: "28px", fontWeight: 900, color: "#e2d609", marginBottom: "4px" }}>{value}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>

          {/* Gallery */}
          <AnimateIn delay={0.15}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {GALLERY.map((src, i) => (
                <div
                  key={src}
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
                  <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,23,0.2)" }} />
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
