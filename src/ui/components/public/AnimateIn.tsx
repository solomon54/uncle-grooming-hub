/**
 * @file AnimateIn.tsx
 * @module ui/components/public
 *
 * Scroll-triggered reveal animation wrapper.
 *
 * Performance rules (from ui-standards.md §5):
 *   - Only animates opacity + translateY (GPU-composited, no layout repaints)
 *   - Uses whileInView instead of useInView to avoid manual ref management
 *   - viewport.once: true — animates once, never re-triggers
 *   - viewport.margin: "-60px" — triggers slightly before fully in view
 *   - ease: [0.16, 1, 0.3, 1] — expo-out, fast settle, no bounce
 */

"use client";

import React from "react";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnimateInProps {
  children:   React.ReactNode;
  delay?:     number;   // seconds — max 0.4 per standards
  duration?:  number;   // seconds — 0.4–0.9 range
  y?:         number;   // px slide-up offset
  className?: string;
  style?:     React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnimateIn({
  children,
  delay    = 0,
  duration = 0.65,
  y        = 28,
  className = "",
  style,
}: AnimateInProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Container ────────────────────────────────────────────────────────

interface StaggerProps {
  children:   React.ReactNode;
  stagger?:   number;
  className?: string;
  style?:     React.CSSProperties;
}

export function StaggerGroup({ children, stagger = 0.08, className = "", style }: StaggerProps) {
  return (
    <div className={className} style={style}>
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        const props = child.props as AnimateInProps;
        return React.cloneElement(child as React.ReactElement<AnimateInProps>, {
          delay: props.delay ?? i * stagger,
        });
      })}
    </div>
  );
}
