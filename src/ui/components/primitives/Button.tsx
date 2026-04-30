/**
 * @file Button.tsx
 * @module ui/components/primitives
 *
 * Cinema Dark button system.
 * Variants map to operational intent — gold for primary actions,
 * ghost for secondary, destructive for irreversible operations.
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "primary"      // Gold — main CTA (Check In, Start Service)
  | "secondary"    // Outlined — supporting actions
  | "ghost"        // Minimal — navigation, toggles
  | "destructive"  // Red — cancel, expire, void
  | "success";     // Green — confirm, settle

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

// ─── Variant Styles ───────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--color-gold-base)] text-[var(--color-text-inverse)]",
    "hover:bg-[var(--color-gold-bright)]",
    "active:bg-[var(--color-gold-muted)]",
    "shadow-[var(--shadow-gold)]",
    "font-semibold",
  ].join(" "),

  secondary: [
    "bg-transparent text-[var(--color-text-primary)]",
    "border border-[var(--color-surface-border)]",
    "hover:border-[var(--color-gold-muted)] hover:text-[var(--color-gold-bright)]",
    "active:bg-[var(--color-surface-overlay)]",
  ].join(" "),

  ghost: [
    "bg-transparent text-[var(--color-text-secondary)]",
    "hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text-primary)]",
    "active:bg-[var(--color-surface-muted)]",
  ].join(" "),

  destructive: [
    "bg-red-500/10 text-red-400",
    "border border-red-500/20",
    "hover:bg-red-500/20 hover:border-red-500/40",
    "active:bg-red-500/30",
  ].join(" "),

  success: [
    "bg-emerald-500/10 text-emerald-400",
    "border border-emerald-500/20",
    "hover:bg-emerald-500/20 hover:border-emerald-500/40",
    "active:bg-emerald-500/30",
  ].join(" "),
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8  px-3   text-xs  gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4   text-sm  gap-2   rounded-[var(--radius-md)]",
  lg: "h-12 px-6   text-base gap-2.5 rounded-[var(--radius-md)]",
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      data-loading={loading ? "true" : undefined}
      aria-label={props["aria-label"]}
      className={[
        // Base
        "inline-flex items-center justify-center",
        "font-medium transition-all select-none",
        "duration-[var(--duration-base)]",
        // Variant
        VARIANT_STYLES[variant],
        // Size
        SIZE_STYLES[size],
        // Width
        fullWidth ? "w-full" : "",
        // Disabled
        isDisabled
          ? "opacity-40 cursor-not-allowed pointer-events-none"
          : "cursor-pointer",
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon && iconPosition === "left"  && <span aria-hidden="true">{icon}</span>}
          {children}
          {icon && iconPosition === "right" && <span aria-hidden="true">{icon}</span>}
        </>
      )}
    </button>
  );
}
