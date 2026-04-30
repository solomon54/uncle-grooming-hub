/**
 * @file LandingPage.tsx
 * @module ui/screens
 *
 * Public landing page — Uncle Grooming Hub.
 * Composed from focused section components.
 * Mobile-first, fully responsive, scroll-animated.
 */

import React from "react";
import { PublicHeader }       from "@/ui/components/public/PublicHeader";
import { PublicFooter }       from "@/ui/components/public/PublicFooter";
import { HeroSection }        from "./landing/HeroSection";
import { ServicesSection }    from "./landing/ServicesSection";
import { HowItWorksSection }  from "./landing/HowItWorksSection";
import { AboutSection }       from "./landing/AboutSection";
import { LocationSection }    from "./landing/LocationSection";
import { CtaBanner }          from "./landing/CtaBanner";
import { ContactStrip }       from "./landing/ContactStrip";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1317] text-white">
      <PublicHeader />
      <main>
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <AboutSection />
        <LocationSection />
        <CtaBanner />
        <ContactStrip />
      </main>
      <PublicFooter />
    </div>
  );
}