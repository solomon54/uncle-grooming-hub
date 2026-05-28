/**
 * @file layout.tsx
 * @module app/change-pin
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function ChangePinLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
