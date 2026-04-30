/**
 * @file ContactStrip.tsx
 * @module ui/screens/landing
 *
 * Pre-footer section — brand, quick links, hours, reserve CTA.
 */

"use client";

import React from "react";
import Link from "next/link";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

export function ContactStrip() {
  return (
    <section
      className="section-divider"
      style={{ padding: "80px 24px", background: "#0f1317" }}
      aria-label="Contact information"
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px" }}>

          {/* Brand */}
          <AnimateIn>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#0f1317", fontWeight: 900, fontSize: "16px" }}>U</span>
              </div>
              <div>
                <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "15px", lineHeight: 1.2 }}>Uncle Grooming Hub</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>Premium Grooming · Addis Ababa</div>
              </div>
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: "280px" }}>
              Where craft meets precision. Reserve your spot, track your queue, and arrive exactly when it's your turn.
            </p>
          </AnimateIn>

          {/* Quick links */}
          <AnimateIn delay={0.1}>
            <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
              Quick Links
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
              {[
                { label: "Services",     href: "#services"     },
                { label: "How It Works", href: "#how-it-works" },
                { label: "About",        href: "#about"        },
                { label: "Location",     href: "#location"     },
                { label: "Live Queue",   href: "/status"       },
                { label: "Reserve",      href: "/reserve"      },
              ].map(l => (
                <a key={l.href} href={l.href} style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
                  {l.label}
                </a>
              ))}
            </div>
          </AnimateIn>

          {/* Hours + CTA */}
          <AnimateIn delay={0.2}>
            <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
              Hours
            </h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)" }}>Every Day</span>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>8:00 AM – 8:00 PM</span>
            </div>
            <Link
              href="/reserve"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "13px 24px", borderRadius: "9999px",
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
  );
}
