/**
 * @file layout.tsx
 * @module app/settlement
 *
 * Settlement Desk route layout.
 * Requires RuntimeProvider + CASHIER or ADMIN session.
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function SettlementLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
