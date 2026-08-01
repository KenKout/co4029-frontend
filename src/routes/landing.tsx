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
        {/* 1. HERO */}
        <HeroSection />

        {/* 2. STATS */}
        <StatsSection />

        {/* 3. BENTO CATEGORIES */}
        <CategoriesSection />

        {/* 4. FEATURED COURSES */}
        <FeaturedCoursesSection />

        {/* 5. TESTIMONIAL */}
        <TestimonialSection />

        {/* 6. INSTRUCTOR CTA */}
        <InstructorCtaSection />
      </main>

      <Footer />
    </>
  );
}
