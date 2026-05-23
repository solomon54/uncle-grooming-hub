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
import { useRouter }       from "next/navigation";
import { sessionService }  from "@/core/session/session.service";
import { SyncIndicator }   from "@/ui/components/primitives/SyncIndicator";
import type { ActiveSession } from "@/core/session/session.types";

// ─── Role badge colors ────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ADMIN:   { bg: "rgba(249,115,22,0.12)", color: "#fb923c", label: "Admin"   },
  CASHIER: { bg: "rgba(14,165,233,0.12)", color: "#38bdf8", label: "Cashier" },
  BARBER:  { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf", label: "Barber"  },
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
  const roleStyle           = ROLE_STYLE[session.role] ?? ROLE_STYLE.CASHIER;

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
        {/* Logo mark */}
        <div style={{
          width: "28px", height: "28px", borderRadius: "7px",
          background: "#e2d609", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ color: "#0f1317", fontSize: "12px", fontWeight: 900 }}>U</span>
        </div>

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

        {/* Actor name */}
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
          {session.actor_name}
        </span>
      </div>

      {/* Right — sync + logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <SyncIndicator state="verified" compact />

        <button
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
