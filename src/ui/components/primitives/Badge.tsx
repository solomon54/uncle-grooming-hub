/**
 * @file Badge.tsx
 * @module ui/components/primitives
 *
 * Semantic status badge for queue states, sync states, and role labels.
 * Maps directly to ECS v1.3 aggregate states and TAS sync indicators.
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "waiting"
  | "reserved"
  | "called"
  | "in-service"
  | "completed"
  | "expired"
  | "sync-local"
  | "sync-transmit"
  | "sync-verified"
  | "sync-error"
  | "role-cashier"
  | "role-barber"
  | "role-admin"
  | "neutral";

export type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  size?: BadgeSize;
  className?: string;
}

// ─── Variant Styles ───────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  "waiting":        "bg-blue-500/10    text-blue-400    border-blue-500/20",
  "reserved":       "bg-violet-500/10  text-violet-400  border-violet-500/20",
  "called":         "bg-amber-500/10   text-amber-400   border-amber-500/20",
  "in-service":     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "completed":      "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  "expired":        "bg-red-500/10     text-red-400     border-red-500/20",
  "sync-local":     "bg-amber-500/10   text-amber-400   border-amber-500/20",
  "sync-transmit":  "bg-blue-500/10    text-blue-400    border-blue-500/20",
  "sync-verified":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "sync-error":     "bg-red-500/10     text-red-400     border-red-500/20",
  "role-cashier":   "bg-sky-500/10     text-sky-400     border-sky-500/20",
  "role-barber":    "bg-teal-500/10    text-teal-400    border-teal-500/20",
  "role-admin":     "bg-orange-500/10  text-orange-400  border-orange-500/20",
  "neutral":        "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2 py-0.5 tracking-wide",
  md: "text-xs     px-2.5 py-1 tracking-wide",
};

// ─── Dot Indicator ────────────────────────────────────────────────────────────

const ANIMATED_VARIANTS: BadgeVariant[] = ["called", "in-service", "sync-transmit"];

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({
  variant,
  label,
  size = "md",
  className = "",
}: BadgeProps) {
  const isAnimated = ANIMATED_VARIANTS.includes(variant);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border font-medium uppercase",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      ].join(" ")}
    >
      {/* Animated pulse dot for active states */}
      {isAnimated && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={[
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              variant === "in-service" ? "bg-emerald-400" :
              variant === "called"     ? "bg-amber-400"   :
                                         "bg-blue-400",
            ].join(" ")}
          />
          <span
            className={[
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              variant === "in-service" ? "bg-emerald-400" :
              variant === "called"     ? "bg-amber-400"   :
                                         "bg-blue-400",
            ].join(" ")}
          />
        </span>
      )}
      {label}
    </span>
  );
}
