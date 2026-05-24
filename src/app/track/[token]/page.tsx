/**
 * @file page.tsx
 * @module app/track/[token]
 *
 * Customer Tracking Page — /track/[token]
 *
 * Specification: CXS v1.1 §3.1 — The Digital Ticket
 *                MODULE_PRIORITY.md P7.4
 *
 * No session required. Public page. Customer opens on their own device.
 * Shows: queue position, barber lane, estimated wait, services, cancel button.
 * Refreshes via Pusher (Phase 4.4) — polling fallback for now.
 *
 * Next.js 16: params is a Promise — unwrap with React.use()
 */

"use client";

import React, { use, useEffect, useState } from "react";
import TrackingScreen from "@/ui/screens/TrackingScreen";

interface TrackPageProps {
  params: Promise<{ token: string }>;
}

export default function TrackPage({ params }: TrackPageProps) {
  const { token } = use(params);
  return <TrackingScreen token={token.toUpperCase()} />;
}
