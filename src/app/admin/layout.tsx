/**
 * @file layout.tsx
 * @module app/admin
 *
 * Admin route layout.
 * Requires RuntimeProvider + ADMIN session.
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
