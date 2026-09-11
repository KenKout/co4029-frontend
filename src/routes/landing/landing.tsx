import Footer from "@/components/layout/Footer";
import LandingNav from "./_components/landing/LandingNav";
import AudienceSection from "./_components/landing/AudienceSection";
import SampleWorkflow from "./_components/landing/SampleWorkflow";
import LandingFaq from "./_components/landing/LandingFaq";
import HeroSection from "./_components/landing/HeroSection";
import GettingStartedSection from "./_components/landing/GettingStartedSection";
import GovernanceSection from "./_components/landing/GovernanceSection";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main
        id="main-content"
        tabIndex={-1}
        className="scroll-mt-20 bg-m3-surface"
      >
        <HeroSection />
        <SampleWorkflow />
        <AudienceSection />
        <GovernanceSection />
        <LandingFaq />
        <GettingStartedSection />
      </main>

      <Footer />
    </>
  );
}
