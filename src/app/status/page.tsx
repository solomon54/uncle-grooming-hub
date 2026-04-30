/**
 * @file page.tsx
 * @module app/status
 *
 * Public Status Board route — /status
 *
 * The Cinema Dark TV display for the shop floor.
 * Requires RuntimeProvider (already in root layout).
 */

import StatusBoardScreen from "@/ui/screens/StatusBoardScreen";

export default function StatusPage() {
  return <StatusBoardScreen />;
}
