/**
 * @file HeroSection.tsx
 * @module ui/screens/landing
 */
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const IMGS = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1920&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1920&q=80&auto=format&fit=crop",
];
const SLIDE_MS = 6000;

function Slideshow({ current }: { current: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden="true">
      {IMGS.map((src, i) => (
        <AnimatePresence key={src}>
          {i === current && (
            <motion.div
              style={{ position: "absolute", inset: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            >
              <motion.div
                style={{ position: "absolute", inset: 0 }}
                initial={{ scale: 1.08 }}
                animate={{ scale: 1.0 }}
                transition={{ duration: SLIDE_MS / 1000 + 2, ease: "linear" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading={i === 0 ? "eager" : "lazy"} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      ))}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,19,23,0.65) 0%, rgba(15,19,23,0.3) 35%, rgba(15,19,23,0.97) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(15,19,23,0.6) 0%, transparent 70%)" }} />
    </div>
  );
}

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % IMGS.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        @media (max-width: 639px) {
          .hero-cta-row { flex-direction: column !important; }
          .hero-cta-row a { width: 100% !important; justify-content: center !important; }
          .hero-trust { gap: 12px !important; }
        }
      `}</style>
      <section
        style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}
        aria-label="Hero"
      >
        <Slideshow current={current} />

        <div style={{ position: "relative", zIndex: 10, width: "100%", padding: "0 24px 56px", maxWidth: "1280px", margin: "0 auto", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "640px", paddingTop: "100px" }}>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "6px 14px", borderRadius: "9999px", marginBottom: "24px",
                border: "1px solid rgba(226,214,9,0.3)", background: "rgba(226,214,9,0.08)",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e2d609", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#e2d609" }}>
                Now Open · Bole, Addis Ababa
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: "20px" }}
            >
              Where Craft<br />
              <span style={{ color: "#e2d609" }}>Meets</span> Precision.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: "500px", marginBottom: "32px" }}
            >
              {"Addis Ababa's premium grooming experience — built for the man who values his time as much as his look. Reserve your chair. Arrive exactly when it's your turn."}
            </motion.p>

            <motion.div
              className="hero-cta-row"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}
            >
              <Link
                href="/reserve"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "15px 28px", borderRadius: "9999px",
                  background: "#e2d609", color: "#0f1317",
                  fontSize: "15px", fontWeight: 800, textDecoration: "none",
                  boxShadow: "0 0 40px rgba(226,214,9,0.35)",
                  whiteSpace: "nowrap", boxSizing: "border-box",
                }}
              >
                Reserve Your Spot →
              </Link>
              <Link
                href="/status"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "14px 28px", borderRadius: "9999px",
                  border: "2px solid rgba(255,255,255,0.2)", color: "#ffffff",
                  fontSize: "15px", fontWeight: 600, textDecoration: "none",
                  whiteSpace: "nowrap", boxSizing: "border-box",
                }}
              >
                View Live Queue
              </Link>
            </motion.div>

            <motion.div
              className="hero-trust"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "36px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              {["No account required", "Real-time queue", "30-min arrival alert"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                  <span style={{ color: "#e2d609", fontSize: "9px" }}>✦</span>{t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "20px", right: "20px", zIndex: 10, display: "flex", gap: "6px" }} aria-hidden="true">
          {IMGS.map((_, i) => (
            <div key={i} style={{ height: "2px", borderRadius: "9999px", transition: "all 0.5s", width: i === current ? "28px" : "8px", background: i === current ? "#e2d609" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      </section>
    </>
  );
}
