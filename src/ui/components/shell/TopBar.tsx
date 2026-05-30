/**
 * @file TopBar.tsx
 * @module ui/components/shell
 *
 * TopBar — operational screen header.
 *
 * Specification: UI Standards §7 — Operational Screen Shell
 *
 * Present on all operational screens: Login, Cashier, Barber, Settlement, Admin.
 * Shows: brand mark, role badge, sync indicator, logout button.
 * Height: 56px. Background: #171d22. Border-bottom: #2d3840.
 */

"use client";

import React, { useState } from "react";
import Link               from "next/link";
import { useRouter }       from "next/navigation";
import { sessionService }  from "@/core/session/session.service";
import { SyncIndicator }   from "@/ui/components/primitives/SyncIndicator";
import { BrandLogo }       from "@/ui/components/primitives/BrandLogo";
import type { ActiveSession } from "@/core/session/session.types";

// ─── Role badge colors ────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  SYSTEM_OWNER: { bg: "rgba(251,146,60,0.15)",  color: "#fb923c", label: "System Owner" },
  ADMIN:        { bg: "rgba(226,214,9,0.12)",   color: "#e2d609", label: "Admin"        },
  CASHIER:      { bg: "rgba(14,165,233,0.12)",  color: "#38bdf8", label: "Cashier"      },
  BARBER:       { bg: "rgba(20,184,166,0.12)",  color: "#2dd4bf", label: "Barber"       },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  session:    ActiveSession;
  onLogout?:  () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar({ session, onLogout }: TopBarProps) {
  const router              = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const roleStyle = ROLE_STYLE[session.role] ?? { bg: "rgba(107,114,128,0.12)", color: "#9ca3af", label: session.role };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await sessionService.logout();
    onLogout?.();
    router.replace("/login");
  };

  return (
    <header style={{
      height: "56px",
      background: "#171d22",
      borderBottom: "1px solid #2d3840",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      flexShrink: 0,
      position: "sticky",
      top: 0,
      zIndex: 40,
    }}>

      {/* Left — brand + role */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Logo — links to home */}
        <Link href="/" aria-label="Dove Barber — home" style={{ display: "flex", alignItems: "center", flexShrink: 0, textDecoration: "none" }}>
          <BrandLogo size={28} />
        </Link>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", background: "#2d3840" }} aria-hidden="true" />

        {/* Role badge */}
        <span style={{
          padding: "3px 10px", borderRadius: "9999px",
          background: roleStyle.bg, color: roleStyle.color,
          fontSize: "11px", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {roleStyle.label}
        </span>

        {/* Actor name + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {(session as unknown as Record<string, unknown>).avatar_url ? (
            <img
              src={(session as unknown as Record<string, unknown>).avatar_url as string}
              alt={session.actor_name}
              width={24} height={24}
              style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", border: "1px solid #3a4650" }}
            />
          ) : (
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#252f38", border: "1px solid #3a4650",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", fontWeight: 800, color: "#e2d609",
            }}>
              {session.actor_name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? "").slice(0, 2).join("")}
            </div>
          )}
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
            {session.actor_name}
          </span>
        </div>
      </div>

      {/* Right — sync + settings + logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <SyncIndicator state="verified" compact />

        <a
          href="/settings"
          style={{
            padding: "6px 12px", borderRadius: "8px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.45)",
            fontSize: "12px", fontWeight: 600,
            textDecoration: "none",
            display: "flex", alignItems: "center", gap: "5px",
            transition: "all 0.2s",
          }}
          aria-label="Settings"
        >
          ⚙️ <span style={{ display: "none" }}>Settings</span>
        </a>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: "6px 14px", borderRadius: "8px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)",
            fontSize: "12px", fontWeight: 600,
            cursor: loggingOut ? "not-allowed" : "pointer",
            opacity: loggingOut ? 0.5 : 1,
            transition: "all 0.2s",
          }}
          aria-label="Log out"
        >
          {loggingOut ? "…" : "Log out"}
        </button>
      </div>
    </header>
  );
}
