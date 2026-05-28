/**
 * @file ContactStrip.tsx
 * @module ui/screens/landing
 */
"use client";
import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

export function ContactStrip() {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .contact-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .contact-links-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .contact-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <section
        className="section-divider"
        style={{ padding: "72px 24px", background: "#0f1317" }}
        aria-label="Contact information"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div
            className="contact-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px" }}
          >

            {/* Brand */}
            <AnimateIn>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px",
                  background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#0f1317", fontWeight: 900, fontSize: "16px" }}>U</span>
                </div>
                <div>
                  <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>Uncle Grooming Hub</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>Premium Grooming · Addis Ababa</div>
                </div>
              </div>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: "280px" }}>
                Where craft meets precision. Reserve your spot, track your queue, and arrive exactly when it's your turn.
              </p>
            </AnimateIn>

            {/* Quick links */}
            <AnimateIn delay={0.1}>
              <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "18px" }}>
                Quick Links
              </h3>
              <div
                className="contact-links-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}
              >
                {[
                  { label: "Services",     href: "#services"     },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "About",        href: "#about"        },
                  { label: "Location",     href: "#location"     },
                  { label: "Live Queue",   href: "/status"       },
                  { label: "Reserve",      href: "/reserve"      },
                ].map(l => (
                  <a key={l.href} href={l.href} style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                    {l.label}
                  </a>
                ))}
              </div>
            </AnimateIn>

            {/* Hours + CTA */}
            <AnimateIn delay={0.2}>
              <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "18px" }}>
                Hours
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>Every Day</span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>8:00 AM – 8:00 PM</span>
              </div>
              <Link
                href="/reserve"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "13px 22px", borderRadius: "9999px",
                  background: "#e2d609", color: "#0f1317",
                  fontSize: "14px", fontWeight: 900, textDecoration: "none",
                  boxShadow: "0 0 20px rgba(226,214,9,0.2)",
                }}
              >
                Reserve Now →
              </Link>
            </AnimateIn>
          </div>
        </div>
      </section>
    </>
  );
}
