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
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,19,23,0.55) 0%, rgba(15,19,23,0.2) 30%, rgba(15,19,23,0.97) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(15,19,23,0.5) 0%, transparent 70%)" }} />
    </div>
  );
}

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % IMGS.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);

  // Close menu on scroll
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, []);

  return (
    <>
      <style>{`
        /* ── Navbar ── */
        .nav-links { display: flex; align-items: center; gap: 28px; }
        .nav-hamburger { display: none; }
        .nav-mobile-menu { display: none; }

        @media (max-width: 767px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-mobile-menu { display: flex !important; }
          .nav-reserve-desktop { display: none !important; }
        }

        /* ── Hero content ── */
        @media (max-width: 767px) {
          .hero-eyebrow { font-size: 10px !important; letter-spacing: 0.08em !important; padding: 5px 11px !important; }
          .hero-h1 { font-size: 28px !important; margin-bottom: 14px !important; line-height: 1.1 !important; }
          .hero-sub { font-size: 14px !important; margin-bottom: 24px !important; line-height: 1.6 !important; }
          .hero-cta-row { flex-direction: column !important; gap: 10px !important; }
          .hero-cta-primary { font-size: 14px !important; padding: 13px 20px !important; width: 100% !important; justify-content: center !important; }
          .hero-cta-secondary { font-size: 14px !important; padding: 12px 20px !important; width: 100% !important; justify-content: center !important; }
          .hero-trust { gap: 10px !important; margin-top: 24px !important; padding-top: 16px !important; }
          .hero-trust span { font-size: 12px !important; }
          .hero-content-pad { padding: 0 20px 48px !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "56px",
        background: "rgba(15,19,23,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
        padding: "0 20px",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#0f1317", fontWeight: 900, fontSize: "14px" }}>U</span>
            </div>
            <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", letterSpacing: "-0.01em" }}>Uncle Grooming</span>
          </Link>

          {/* Desktop links */}
          <div className="nav-links">
            {[["Services", "#services"], ["How It Works", "#how-it-works"], ["About", "#about"], ["Location", "#location"]].map(([label, href]) => (
              <a key={href} href={href} style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", textDecoration: "none", fontWeight: 500 }}>{label}</a>
            ))}
          </div>

          {/* Desktop CTA */}
          <Link
            className="nav-reserve-desktop"
            href="/reserve"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", borderRadius: "9999px",
              background: "#e2d609", color: "#0f1317",
              fontSize: "13px", fontWeight: 800, textDecoration: "none",
            }}
          >
            Reserve →
          </Link>

          {/* Hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "none", flexDirection: "column", gap: "5px" }}
          >
            <span style={{ display: "block", width: "22px", height: "2px", background: menuOpen ? "#e2d609" : "rgba(255,255,255,0.8)", borderRadius: "2px", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ display: "block", width: "22px", height: "2px", background: menuOpen ? "transparent" : "rgba(255,255,255,0.8)", borderRadius: "2px", transition: "all 0.2s" }} />
            <span style={{ display: "block", width: "22px", height: "2px", background: menuOpen ? "#e2d609" : "rgba(255,255,255,0.8)", borderRadius: "2px", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div
            className="nav-mobile-menu"
            style={{
              position: "absolute", top: "56px", left: 0, right: 0,
              background: "rgba(15,19,23,0.98)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              flexDirection: "column",
              padding: "8px 20px 20px",
              gap: "0",
            }}
          >
            {[["Services", "#services"], ["How It Works", "#how-it-works"], ["About", "#about"], ["Location", "#location"]].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{ fontSize: "15px", color: "rgba(255,255,255,0.75)", textDecoration: "none", fontWeight: 500, padding: "13px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "block" }}
              >
                {label}
              </a>
            ))}
            <div style={{ paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/status"
                onClick={() => setMenuOpen(false)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
              >
                View Live Queue
              </Link>
              <Link
                href="/reserve"
                onClick={() => setMenuOpen(false)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "13px", borderRadius: "10px", background: "#e2d609", color: "#0f1317", fontSize: "14px", fontWeight: 800, textDecoration: "none" }}
              >
                Reserve Your Spot →
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section
        style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}
        aria-label="Hero"
      >
        <Slideshow current={current} />

        <div
          className="hero-content-pad"
          style={{ position: "relative", zIndex: 10, width: "100%", padding: "0 24px 60px", maxWidth: "1280px", margin: "0 auto", boxSizing: "border-box" }}
        >
          <div style={{ maxWidth: "600px", paddingTop: "80px" }}>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "5px 12px", borderRadius: "9999px", marginBottom: "18px",
                border: "1px solid rgba(226,214,9,0.3)", background: "rgba(226,214,9,0.08)",
              }}
            >
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#e2d609", display: "inline-block", flexShrink: 0 }} />
              <span className="hero-eyebrow" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#e2d609" }}>
                Now Open · Bole, Addis Ababa
              </span>
            </motion.div>

            <motion.h1
              className="hero-h1"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: "clamp(28px, 5.5vw, 64px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: "16px" }}
            >
              Where Craft<br />
              <span style={{ color: "#e2d609" }}>Meets</span> Precision.
            </motion.h1>

            <motion.p
              className="hero-sub"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: "clamp(14px, 1.6vw, 17px)", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: "480px", marginBottom: "28px" }}
            >
              {"Addis Ababa's premium grooming experience. Reserve your chair, arrive exactly when it's your turn."}
            </motion.p>

            <motion.div
              className="hero-cta-row"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}
            >
              <Link
                href="/reserve"
                className="hero-cta-primary"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "13px 24px", borderRadius: "9999px",
                  background: "#e2d609", color: "#0f1317",
                  fontSize: "14px", fontWeight: 800, textDecoration: "none",
                  boxShadow: "0 0 32px rgba(226,214,9,0.3)",
                  boxSizing: "border-box",
                }}
              >
                Reserve Your Spot →
              </Link>
              <Link
                href="/status"
                className="hero-cta-secondary"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "12px 24px", borderRadius: "9999px",
                  border: "1.5px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)",
                  fontSize: "14px", fontWeight: 600, textDecoration: "none",
                  boxSizing: "border-box",
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
              style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              {["No account required", "Real-time queue", "30-min alert"].map(t => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  <span style={{ color: "#e2d609", fontSize: "8px" }}>✦</span>{t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "18px", right: "18px", zIndex: 10, display: "flex", gap: "5px" }} aria-hidden="true">
          {IMGS.map((_, i) => (
            <div key={i} style={{ height: "2px", borderRadius: "9999px", transition: "all 0.5s", width: i === current ? "24px" : "7px", background: i === current ? "#e2d609" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
      </section>
    </>
  );
}
