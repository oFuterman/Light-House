import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

function SectionDivider() {
    return (
        <div className="h-px bg-gradient-to-r from-transparent via-beacon-200 to-transparent dark:hidden" />
    );
}

export default function Home() {
    return (
        <main className="min-h-screen">
            <LandingNav />
            <HeroSection />
            <SectionDivider />
            <FeaturesGrid />
            <HowItWorks />
            <SectionDivider />
            <DashboardPreview />
            <PricingSection />
            <SectionDivider />
            <CTASection />
            <Footer />
        </main>
    );
}
