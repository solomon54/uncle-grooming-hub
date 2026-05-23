/**
 * @file RouteGuard.tsx
 * @module ui/components/auth
 *
 * RouteGuard — protects operational routes from unauthenticated access.
 *
 * Specification: UI Standards §12 — Route Map
 *                TAS v1.0 §9 — RBAC Enforcement
 *
 * Usage:
 *   <RouteGuard roles={["CASHIER", "ADMIN"]}>
 *     <CashierScreen />
 *   </RouteGuard>
 *
 * Behavior:
 *   - Loading: shows Cinema Dark spinner (prevents flash)
 *   - No session: redirects to /login
 *   - Wrong role: redirects to /login with reason
 *   - Valid session: renders children
 */

"use client";

import React, { useEffect } from "react";
import { useRouter }        from "next/navigation";
import { useSession }       from "@/ui/hooks/useSession";
import type { OperatorRole } from "@/core/session/session.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteGuardProps {
  roles:    OperatorRole[];
  children: React.ReactNode;
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function GuardSpinner() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0f1317",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <svg
        style={{ width: "20px", height: "20px", color: "#e2d609", animation: "spin 1s linear infinite" }}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RouteGuard({ roles, children }: RouteGuardProps) {
  const router          = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!roles.includes(session.role)) {
      router.replace("/login");
    }
  }, [session, loading, roles, router]);

  if (loading) return <GuardSpinner />;
  if (!session) return <GuardSpinner />;
  if (!roles.includes(session.role)) return <GuardSpinner />;

  return <>{children}</>;
}
