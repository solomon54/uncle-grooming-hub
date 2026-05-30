/**
 * @file BrandLogo.tsx
 * @module ui/components/primitives
 *
 * BrandLogo — the Dove Barber logo image with optional brand name text.
 * Uses /assets/logo.png from the public folder.
 *
 * Usage:
 *   <BrandLogo size={40} />                    — logo only
 *   <BrandLogo size={40} showName />           — logo + "Dove Barber"
 *   <BrandLogo size={40} showName href="/" />  — linked logo + name
 */

import React from "react";
import Image from "next/image";
import Link  from "next/link";

interface BrandLogoProps {
  /** Height of the logo image in px */
  size?:     number;
  /** Show the brand name text next to the logo */
  showName?: boolean;
  /** Wrap in a link — pass "/" for public pages, omit for non-linked use */
  href?:     string;
  /** Extra style on the wrapper */
  style?:    React.CSSProperties;
  /** Name text color — defaults to white */
  nameColor?: string;
  /** Name font size — defaults to 16px */
  nameFontSize?: string | number;
}

function LogoContent({
  size = 36,
  showName = false,
  nameColor = "#ffffff",
  nameFontSize = 16,
}: BrandLogoProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <Image
        src="/assets/logo.png"
        alt="Dove Barber logo"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
        priority
      />
      {showName && (
        <span style={{
          color: nameColor,
          fontSize: nameFontSize,
          fontWeight: 800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          lineHeight: 1,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Dove Barber
        </span>
      )}
    </span>
  );
}

export function BrandLogo({ href, style, ...props }: BrandLogoProps) {
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", ...style }} aria-label="Dove Barber — home">
        <LogoContent {...props} />
      </Link>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", ...style }}>
      <LogoContent {...props} />
    </span>
  );
}
