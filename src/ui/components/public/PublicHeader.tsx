/**
 * @file PublicHeader.tsx
 * @module ui/components/public
 *
 * Public site header — fixed, transparent on hero, solid on scroll.
 * Mobile: hamburger with full-screen overlay.
 * Desktop: inline nav + CTA.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Services",     href: "#services"     },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About",        href: "#about"        },
  { label: "Location",     href: "#location"     },
] as const;

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const headerBg = scrolled || menuOpen
    ? "rgba(23,29,34,0.97)"
    : "transparent";

  const headerBorder = scrolled || menuOpen
    ? "1px solid #2d3840"
    : "1px solid transparent";

  return (
    <>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: headerBg,
        borderBottom: headerBorder,
        backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 24px", height: "72px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>

          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }} aria-label="Uncle Grooming Hub">
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#0f1317", fontSize: "14px", fontWeight: 900 }}>U</span>
            </div>
            <span style={{ color: "#ffffff", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Uncle<span style={{ color: "#e2d609" }}>.</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: "4px" }} aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  padding: "8px 16px", borderRadius: "8px",
                  fontSize: "14px", fontWeight: 500,
                  color: "rgba(255,255,255,0.7)", textDecoration: "none",
                  transition: "color 0.2s",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/status" style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
              Live Queue
            </Link>
            <Link
              href="/reserve"
              style={{
                padding: "9px 22px", borderRadius: "9999px",
                border: "2px solid #e2d609", color: "#e2d609",
                fontSize: "14px", fontWeight: 700, textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              Reserve Spot
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: "none", // shown via media query workaround below
              flexDirection: "column", justifyContent: "center", alignItems: "center",
              width: "40px", height: "40px", gap: "5px",
              background: "transparent", border: "none", cursor: "pointer",
            }}
            aria-label="Toggle navigation menu"
            aria-controls="mobile-menu"
            className="mobile-menu-btn"
          >
            <span style={{ display: "block", width: "20px", height: "2px", background: "#ffffff", borderRadius: "2px", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ display: "block", width: "20px", height: "2px", background: "#ffffff", borderRadius: "2px", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: "20px", height: "2px", background: "#ffffff", borderRadius: "2px", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Navigation menu"
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "#171d22",
          display: "flex", flexDirection: "column",
          transition: "opacity 0.3s, pointer-events 0.3s",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      >
        <div style={{ height: "72px" }} />
        <nav style={{ display: "flex", flexDirection: "column", padding: "32px 24px", gap: "8px" }}>
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "16px 0", fontSize: "20px", fontWeight: 700,
                color: "rgba(255,255,255,0.8)", textDecoration: "none",
                borderBottom: "1px solid #2d3840",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link
            href="/reserve"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: "16px", borderRadius: "9999px", textAlign: "center",
              border: "2px solid #e2d609", color: "#e2d609",
              fontSize: "16px", fontWeight: 700, textDecoration: "none",
            }}
          >
            Reserve Your Spot
          </Link>
          <Link
            href="/status"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: "16px", borderRadius: "9999px", textAlign: "center",
              border: "1px solid #2d3840", color: "rgba(255,255,255,0.6)",
              fontSize: "16px", fontWeight: 500, textDecoration: "none",
            }}
          >
            View Live Queue
          </Link>
        </div>
      </div>

      {/* Responsive: hide desktop nav on mobile */}
      <style>{`
        @media (max-width: 768px) {
          nav[aria-label="Main navigation"],
          header > div > div:last-child { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          #mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
}
