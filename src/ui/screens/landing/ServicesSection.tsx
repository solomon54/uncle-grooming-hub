/**
 * @file ServicesSection.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const SERVICES = [
  {
    name:        "Classic Cut",
    description: "Precision fade or scissor cut with hot towel finish and scalp massage.",
    duration:    "30 min",
    price:       350,
    image:       "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80&auto=format&fit=crop",
    featured:    false,
  },
  {
    name:        "Premium Cut",
    description: "Extended session for complex styles — razor outline, warm foam, aftershave massage.",
    duration:    "45 min",
    price:       500,
    image:       "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80&auto=format&fit=crop",
    featured:    true,
  },
  {
    name:        "Beard Grooming",
    description: "Shape, razor outline, hot towel treatment, beard oil conditioning and styling.",
    duration:    "30 min",
    price:       250,
    image:       "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80&auto=format&fit=crop",
    featured:    false,
  },
  {
    name:        "Cut & Beard Combo",
    description: "Full haircut paired with complete beard grooming — the complete look.",
    duration:    "60 min",
    price:       700,
    image:       "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80&auto=format&fit=crop",
    featured:    false,
  },
  {
    name:        "Head Shave",
    description: "Smooth razor shave with warm foam, essential oil towels, and cooling massage.",
    duration:    "30 min",
    price:       300,
    image:       "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop",
    featured:    false,
  },
  {
    name:        "Kids Cut",
    description: "Gentle precision cut for young clients — patient, careful, and fun.",
    duration:    "20 min",
    price:       200,
    image:       "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80&auto=format&fit=crop",
    featured:    false,
  },
] as const;

export function ServicesSection() {
  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .services-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .services-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <section id="services" className="section-divider" style={{ padding: "80px 24px", background: "#0f1317" }} aria-label="Services">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          <AnimateIn>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "14px" }}>
                The Menu
              </span>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, color: "#ffffff", marginBottom: "16px", lineHeight: 1.1 }}>
                Services &amp; Pricing
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: "440px", margin: "0 auto", fontSize: "16px", lineHeight: 1.7 }}>
                Every service is a craft. Prices in Ethiopian Birr — transparent, no surprises.
              </p>
            </div>
          </AnimateIn>

          <div
            className="services-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}
          >
            {SERVICES.map((s, i) => (
              <AnimateIn key={s.name} delay={i * 0.07}>
                <div
                  style={{
                    borderRadius: "16px", overflow: "hidden",
                    border: s.featured ? "1px solid rgba(226,214,9,0.4)" : "1px solid #2d3840",
                    boxShadow: s.featured ? "0 0 30px rgba(226,214,9,0.1)" : "none",
                    background: "#171d22",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Image */}
                  <div style={{ position: "relative", height: "180px", overflow: "hidden", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.image}
                      alt={s.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #171d22 0%, rgba(23,29,34,0.2) 60%, transparent 100%)" }} />
                    {s.featured && (
                      <div style={{ position: "absolute", top: "12px", left: "12px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "#e2d609", color: "#0f1317", fontSize: "9px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div style={{ position: "absolute", top: "12px", right: "12px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "9999px", background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.7)", fontSize: "10px", fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)" }}>
                        {s.duration}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: s.featured ? "#e2d609" : "#ffffff", marginBottom: "8px" }}>
                      {s.name}
                    </h3>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "16px", flex: 1 }}>
                      {s.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid #2d3840" }}>
                      <Link href="/reserve" style={{ fontSize: "12px", fontWeight: 700, color: "#e2d609", textDecoration: "none" }}>
                        Book this →
                      </Link>
                      <span style={{ fontSize: "20px", fontWeight: 900, color: s.featured ? "#e2d609" : "#ffffff" }}>
                        {s.price.toLocaleString()}
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.4)", marginLeft: "3px" }}>ETB</span>
                      </span>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <AnimateIn delay={0.25}>
            <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.25)", marginTop: "20px" }}>
              * Prices are indicative. Confirm at the shop.
            </p>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
