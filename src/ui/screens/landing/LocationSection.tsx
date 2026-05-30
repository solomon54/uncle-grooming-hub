/**
 * @file LocationSection.tsx
 * @module ui/screens/landing
 *
 * Location — Gerji Mebrat Haile, in front of Engine Hotel.
 * Embedded Google Maps iframe + info cards.
 */
"use client";
import React from "react";
import { AnimateIn } from "@/ui/components/public/AnimateIn";

// Gerji Mebrat Haile, Addis Ababa — approximate coordinates
const LAT  = 9.0167;
const LNG  = 38.8167;
const ZOOM = 16;

// Google Maps embed URL (no API key needed for basic embed)
const MAPS_EMBED = `https://maps.google.com/maps?q=${LAT},${LNG}&z=${ZOOM}&output=embed`;
const MAPS_LINK  = `https://maps.google.com/?q=${LAT},${LNG}`;

const INFO = [
  {
    icon: "📍",
    title: "Address",
    lines: ["Gerji Mebrat Haile", "In front of Engine Hotel", "Addis Ababa, Ethiopia"],
    action: { label: "Open in Google Maps →", href: MAPS_LINK },
  },
  {
    icon: "🕐",
    title: "Hours",
    lines: ["Every Day", "8:00 AM – 12:00 AM"],
    action: null,
  },
  {
    icon: "📞",
    title: "Contact",
    lines: ["+251 9XX XXX XXX"],
    action: { label: "Call us →", href: "tel:+251911426228" },
  },
];

export function LocationSection() {
  return (
    <>
      <style>{`
        .loc-layout { display: flex; flex-direction: column; gap: 16px; }
        .loc-cards  { display: flex; flex-direction: column; gap: 10px; }
        .loc-card   {
          display: flex; gap: 14px; padding: 16px 18px;
          border-radius: 14px; background: #0f1317;
          border: 1px solid #2d3840; align-items: flex-start;
        }
        .loc-icon {
          width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0;
          background: rgba(226,214,9,0.08); border: 1px solid rgba(226,214,9,0.18);
          display: flex; align-items: center; justify-content: center; font-size: 17px;
        }
        .loc-map-wrap {
          width: 100%; border-radius: 16px; overflow: hidden;
          border: 1px solid #2d3840; position: relative;
          height: 240px;
        }
        .loc-map-wrap iframe {
          width: 100%; height: 100%; border: none; display: block;
          filter: invert(90%) hue-rotate(180deg) saturate(0.9) brightness(0.85);
        }
        .loc-map-open {
          position: absolute; bottom: 12px; right: 12px;
          padding: 7px 14px; border-radius: 9999px;
          background: rgba(15,19,23,0.92); border: 1px solid #2d3840;
          color: #e2d609; font-size: 12px; font-weight: 700;
          text-decoration: none; backdrop-filter: blur(8px);
          display: flex; align-items: center; gap: 5px;
          transition: background 0.15s;
        }

        @media (min-width: 768px) {
          .loc-layout { flex-direction: row; gap: 24px; align-items: stretch; }
          .loc-cards  { flex: 2; }
          .loc-map-wrap { flex: 3; height: auto; min-height: 320px; }
        }
      `}</style>

      <section
        id="location"
        style={{ padding: "clamp(40px,6vw,80px) clamp(16px,4vw,24px)", background: "#171d22" }}
        aria-label="Location"
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

          {/* Header */}
          <AnimateIn>
            <div style={{ marginBottom: "clamp(24px,4vw,52px)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e2d609", display: "block", marginBottom: "8px" }}>
                Find Us
              </span>
              <h2 style={{ fontSize: "clamp(22px,4.5vw,50px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "6px" }}>
                Gerji Mebrat Haile
              </h2>
              <p style={{ fontSize: "clamp(13px,1.5vw,15px)", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                In front of Engine Hotel · Addis Ababa, Ethiopia
              </p>
            </div>
          </AnimateIn>

          <div className="loc-layout">

            {/* Info cards */}
            <div className="loc-cards">
              {INFO.map(({ icon, title, lines, action }, i) => (
                <AnimateIn key={title} delay={i * 0.07}>
                  <div className="loc-card">
                    <div className="loc-icon">{icon}</div>
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", marginBottom: "5px" }}>
                        {title}
                      </div>
                      {lines.map(l => (
                        <div key={l} style={{ fontSize: "14px", color: "rgba(255,255,255,0.82)", fontWeight: 500, lineHeight: 1.5 }}>
                          {l}
                        </div>
                      ))}
                      {action && (
                        <a
                          href={action.href}
                          target={action.href.startsWith("http") ? "_blank" : undefined}
                          rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          style={{ fontSize: "12px", color: "#e2d609", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px", fontWeight: 600 }}
                        >
                          {action.label}
                        </a>
                      )}
                    </div>
                  </div>
                </AnimateIn>
              ))}

              {/* Landmark callout */}
              <AnimateIn delay={0.22}>
                <div style={{ padding: "14px 18px", borderRadius: "14px", background: "rgba(226,214,9,0.06)", border: "1px solid rgba(226,214,9,0.18)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>🏨</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#e2d609", marginBottom: "3px" }}>Landmark</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>
                      Directly in front of <strong style={{ color: "rgba(255,255,255,0.85)" }}>Engine Hotel</strong> on the main Gerji Mebrat Haile road. Easy to spot — look for the gold signage.
                    </div>
                  </div>
                </div>
              </AnimateIn>
            </div>

            {/* Embedded Google Map */}
            <AnimateIn delay={0.12}>
              <div className="loc-map-wrap">
                <iframe
                  src={MAPS_EMBED}
                  title="Dove Barber location — Gerji Mebrat Haile, Addis Ababa"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={MAPS_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="loc-map-open"
                  aria-label="Open in Google Maps"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open in Maps
                </a>
              </div>
            </AnimateIn>

          </div>
        </div>
      </section>
    </>
  );
}
