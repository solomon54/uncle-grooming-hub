/**
 * @file layout.tsx
 * @module app/cashier
 *
 * Cashier route layout.
 * Requires RuntimeProvider (event emission) + CASHIER or ADMIN session.
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
