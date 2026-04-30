/**
 * @file layout.tsx
 * @module app/status
 *
 * Status route layout — wraps with RuntimeProvider.
 * The Status Board is a live projection consumer and requires
 * the offline-first runtime to be initialized before rendering.
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RuntimeProvider>
      {children}
    </RuntimeProvider>
  );
}
