/**
 * @file AnimateIn.tsx
 * @module ui/components/public
 *
 * Scroll-triggered reveal animation wrapper.
 * Elements animate in as they enter the viewport — fade + slide up.
 * Stagger delay supported for sequential reveals within a group.
 */

"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnimateInProps {
  children:   React.ReactNode;
  delay?:     number;   // seconds
  duration?:  number;   // seconds
  y?:         number;   // px offset to slide from
  className?: string;
  once?:      boolean;  // only animate once (default: true)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnimateIn({
  children,
  delay    = 0,
  duration = 0.7,
  y        = 32,
  className = "",
  once     = true,
}: AnimateInProps) {
  const ref     = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once, margin: "-80px 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // expo out — fast settle, no bounce
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Container ────────────────────────────────────────────────────────

interface StaggerProps {
  children:   React.ReactNode;
  stagger?:   number;  // seconds between each child
  className?: string;
}

/**
 * Wraps children and staggers their AnimateIn delays automatically.
 * Each direct child gets an incrementing delay.
 */
export function StaggerGroup({ children, stagger = 0.1, className = "" }: StaggerProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<AnimateInProps>, {
          delay: (child.props as AnimateInProps).delay ?? i * stagger,
        });
      })}
    </div>
  );
}
