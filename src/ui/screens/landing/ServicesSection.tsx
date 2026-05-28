/**
 * @file ServicesSection.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

const SERVICES = [
  { name: "Classic Cut", description: "Precision fade or scissor cut with hot towel finish and scalp massage.", duration: "30 min", price: 350, image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80&auto=format&fit=crop", featured: false },
  { name: "Premium Cut", description: "Extended session for complex styles — razor outline, warm foam, aftershave massage.", duration: "45 min", price: 500, image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80&auto=format&fit=crop", featured: true },
  { name: "Beard Grooming", description: "Shape, razor outline, hot towel treatment, beard oil conditioning and styling.", duration: "30 min", price: 250, image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80&auto=format&fit=crop", featured: false },
  { name: "Cut & Beard Combo", description: "Full haircut paired with complete beard grooming — the complete look.", duration: "60 min", price: 700, image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80&auto=format&fit=crop", featured: false },
  { name: "Head Shave", description: "Smooth razor shave with warm foam, essential oil towels, and cooling massage.", duration: "30 min", price: 300, image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80&auto=format&fit=crop", featured: false },
  { name: "Kids Cut", description: "Gentle precision cut for young clients — patient, careful, and fun.", duration: "20 min", price: 200, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80&auto=format&fit=crop", featured: false },
] as const;

export function ServicesSection() {
  return (
    <>
      <style>{`
        .sv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 639px) {
          .sv-section { padding: 56px 20px !important; }
          .sv-hdr { margin-bottom: 28px !important; }
          .sv-h2 { font-size: 20px !important; margin-bottom: 8px !important; }
          .sv-sub { font-size: 13px !important; }
          .sv-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .sv-img { height: 150px !important; }
          .sv-body { padding: 13px 14px !important; }
          .sv-name { font-size: 14px !important; margin-bottom: 5px !important; }
          .sv-desc { font-size: 12px !important; margin-bottom: 11px !important; }
          .sv-ft { padding-top: 10px !important; }
          .sv-price { font-size: 17px !important; }
          .sv-book { font-size: 12px !important; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .sv-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <section id="services" className="sv-section section-divider" style={{ padding: "80px 24px", background: "#0f1317" }} aria-label="Services">
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <AnimateIn>
            <div className="sv-hdr" style={{ textAlign: "center", marginBottom: "48px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "10px" }}>The Menu</span>
              <h2 className="sv-h2" style={{ fontSize: "clamp(20px, 4vw, 46px)", fontWeight: 900, color: "#ffffff", marginBottom: "12px", lineHeight: 1.1 }}>Services &amp; Pricing</h2>
              <p className="sv-sub" style={{ color: "rgba(255,255,255,0.5)", maxWidth: "380px", margin: "0 auto", fontSize: "15px", lineHeight: 1.6 }}>
                Every service is a craft. Prices in Ethiopian Birr — transparent, no surprises.
              </p>
            </div>
          </AnimateIn>
          <div className="sv-grid">
            {SERVICES.map((s, i) => (
              <AnimateIn key={s.name} delay={i * 0.06}>
                <div style={{ borderRadius: "13px", overflow: "hidden", border: s.featured ? "1px solid rgba(226,214,9,0.4)" : "1px solid #2d3840", boxShadow: s.featured ? "0 0 24px rgba(226,214,9,0.09)" : "none", background: "#171d22", display: "flex", flexDirection: "column" }}>
                  <div className="sv-img" style={{ position: "relative", height: "168px", overflow: "hidden", flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #171d22 0%, transparent 60%)" }} />
                    {s.featured && <div style={{ position: "absolute", top: "10px", left: "10px" }}><span style={{ padding: "3px 9px", borderRadius: "9999px", background: "#e2d609", color: "#0f1317", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Most Popular</span></div>}
                    <div style={{ position: "absolute", top: "10px", right: "10px" }}><span style={{ padding: "3px 8px", borderRadius: "9999px", background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)", fontSize: "10px", border: "1px solid rgba(255,255,255,0.1)" }}>{s.duration}</span></div>
                  </div>
                  <div className="sv-body" style={{ padding: "15px 17px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h3 className="sv-name" style={{ fontSize: "15px", fontWeight: 700, color: s.featured ? "#e2d609" : "#ffffff", marginBottom: "6px" }}>{s.name}</h3>
                    <p className="sv-desc" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.55, marginBottom: "13px", flex: 1 }}>{s.description}</p>
                    <div className="sv-ft" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "11px", borderTop: "1px solid #2d3840" }}>
                      <Link href="/reserve" className="sv-book" style={{ fontSize: "12px", fontWeight: 700, color: "#e2d609", textDecoration: "none" }}>Book this →</Link>
                      <span className="sv-price" style={{ fontSize: "18px", fontWeight: 900, color: s.featured ? "#e2d609" : "#ffffff" }}>
                        {s.price.toLocaleString()}<span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.4)", marginLeft: "2px" }}>ETB</span>
                      </span>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
          <AnimateIn delay={0.2}><p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "16px" }}>* Prices are indicative. Confirm at the shop.</p></AnimateIn>
        </div>
      </section>
    </>
  );
}
