/**
 * @file page.tsx
 * @module app
 *
 * Root route — public landing page.
 *
 * This is a Server Component (no "use client") — the landing page
 * has no client-side interactivity at the route level. Individual
 * sections that need interactivity (header scroll, mobile menu)
 * are client components themselves.
 */

import LandingPage from "@/ui/screens/LandingPage";

export default function HomePage() {
  return <LandingPage />;
}
