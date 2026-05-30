/**
 * @file layout.tsx
 * @module app
 *
 * Root layout — Cinema Dark shell.
 *
 * NOTE: RuntimeProvider is NOT included here — it's only needed on
 * operational routes (/status, /cashier, /barber, /reserve, etc.).
 * The public landing page (/) is a pure Server Component and does
 * not require the offline-first runtime to boot.
 *
 * Routes that need the runtime wrap themselves with RuntimeProvider.
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title:       "Dove Barber — Premium Grooming, Addis Ababa",
  description: "Reserve your spot at Addis Ababa's premier grooming experience. Walk in or book ahead — your barber is ready.",
  keywords:    ["barbershop", "grooming", "Addis Ababa", "Ethiopia", "haircut", "beard", "Dove Barber"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
