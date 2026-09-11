import { useReveal } from "@/hooks/use-reveal";
import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import CategoriesSection from "./_components/landing/CategoriesSection";
import FeaturedCoursesSection from "./_components/landing/FeaturedCoursesSection";
import HeroSection from "./_components/landing/HeroSection";
import InstructorCtaSection from "./_components/landing/InstructorCtaSection";
import StatsSection from "./_components/landing/StatsSection";
import TestimonialSection from "./_components/landing/TestimonialSection";

export default function LandingPage() {
  const revealRef = useReveal<HTMLElement>();

  return (
    <>
      <TopNavBar />

      <main ref={revealRef} className="pt-16">
        {/* 1. PRODUCT PROMISE */}
        <HeroSection />

        {/* 2. LEARNING PRINCIPLES */}
        <StatsSection />

        {/* 3. CONNECTED ACADEMIC MODEL */}
        <CategoriesSection />

        {/* 4. KNOWLEDGE-TO-EVIDENCE WORKFLOW */}
        <FeaturedCoursesSection />

        {/* 5. RESPONSIBLE AI */}
        <TestimonialSection />

        {/* 6. INSTITUTIONAL CTA */}
        <InstructorCtaSection />
      </main>

      <Footer />
    </>
  );
}
