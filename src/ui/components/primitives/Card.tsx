/**
 * @file Card.tsx
 * @module ui/components/primitives
 *
 * Cinema Dark surface container.
 * Three elevation levels matching the background scale:
 *   base    → sits on void background (panels, sidebars)
 *   raised  → standard card (queue entries, dashboards)
 *   overlay → modal-level surfaces, popovers
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardElevation = "base" | "raised" | "overlay";

interface CardProps {
  elevation?: CardElevation;
  padding?: "none" | "sm" | "md" | "lg";
  bordered?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  role?: string;
  "aria-label"?: string;
}

// ─── Elevation Styles ─────────────────────────────────────────────────────────

const ELEVATION_STYLES: Record<CardElevation, string> = {
  base:    "bg-[var(--color-surface-base)]",
  raised:  "bg-[var(--color-surface-raised)]",
  overlay: "bg-[var(--color-surface-overlay)]",
};

const PADDING_STYLES = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-6",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Card({
  elevation = "raised",
  padding = "md",
  bordered = true,
  className = "",
  children,
  onClick,
  ...rest
}: CardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={[
        "rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-card)]",
        ELEVATION_STYLES[elevation],
        PADDING_STYLES[padding],
        bordered ? "border border-[var(--color-surface-border)]" : "",
        isInteractive
          ? "cursor-pointer transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-surface-muted)] hover:bg-[var(--color-surface-overlay)]"
          : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Card Sub-components ──────────────────────────────────────────────────────

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = "" }: CardHeaderProps) {
  return (
    <div className={["flex items-start justify-between gap-4 mb-4", className].join(" ")}>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface CardDividerProps {
  className?: string;
}

export function CardDivider({ className = "" }: CardDividerProps) {
  return (
    <hr
      className={[
        "border-0 border-t border-[var(--color-surface-border)] my-3",
        className,
      ].join(" ")}
    />
  );
}
