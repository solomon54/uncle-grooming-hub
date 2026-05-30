import { RuntimeProvider } from "@/ui/providers/RuntimeProviders";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <RuntimeProvider>{children}</RuntimeProvider>;
}
