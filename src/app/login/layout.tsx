/**
 * @file layout.tsx
 * @module app/login
 *
 * Login route layout — wraps with RuntimeProvider.
 * EVENT 13 is emitted on successful login, which requires the runtime.
 */

import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
