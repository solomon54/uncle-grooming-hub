
/**
 * @file ServicesSection.tsx
 * @module ui/screens/landing
 *
 * Services — premium cards with Unsplash images, prices in ETB.
 * Scroll-triggered stagger reveal.
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
    <section id="services" className="section-divider" style={{ padding: "96px 24px", background: "#0f1317" }} aria-label="Services">
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

        {/* Header */}
        <AnimateIn>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "16px" }}>
              The Menu
            </span>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "#ffffff", marginBottom: "20px", lineHeight: 1.1 }}>
              Services &amp; Pricing
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: "480px", margin: "0 auto", fontSize: "17px", lineHeight: 1.7 }}>
              Every service is a craft. Prices in Ethiopian Birr — transparent, no surprises.
            </p>
          </div>
        </AnimateIn>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          {SERVICES.map((s, i) => (
            <AnimateIn key={s.name} delay={i * 0.08}>
              <div
                className="group"
                style={{
                  borderRadius: "16px", overflow: "hidden",
                  border: s.featured ? "1px solid rgba(226,214,9,0.4)" : "1px solid #2d3840",
                  boxShadow: s.featured ? "0 0 30px rgba(226,214,9,0.1)" : "none",
                  transition: "all 0.3s ease",
                  background: "#171d22",
                }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171d22] via-[#171d22]/20 to-transparent" />

                  {/* Featured badge */}
                  {s.featured && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-[#e2d609] text-[#0f1317] text-[10px] font-black uppercase tracking-widest">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Duration pill */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white/70 text-[10px] font-medium border border-white/10">
                      {s.duration}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "20px", background: "#171d22" }}>
                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: s.featured ? "#e2d609" : "#ffffff", marginBottom: "8px" }}>
                    {s.name}
                  </h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: "20px", minHeight: "48px" }}>
                    {s.description}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid #2d3840" }}>
                    <Link href="/reserve" style={{ fontSize: "12px", fontWeight: 700, color: "#e2d609", textDecoration: "none" }}>
                      Book this →
                    </Link>
                    <span style={{ fontSize: "22px", fontWeight: 900, color: s.featured ? "#e2d609" : "#ffffff" }}>
                      {s.price.toLocaleString()}
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.4)", marginLeft: "4px" }}>ETB</span>
                    </span>
                  </div>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={0.3}>
          <p style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.25)", marginTop: "24px" }}>
            * Prices are indicative. Confirm at the shop.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
