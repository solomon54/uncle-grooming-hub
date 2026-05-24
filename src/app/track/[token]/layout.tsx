/**
 * @file layout.tsx
 * @module app/track/[token]
 *
 * Customer tracking route layout.
 * Requires RuntimeProvider — reads from QueueBoard + BarberLane projections.
 * No session required — public page.
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
