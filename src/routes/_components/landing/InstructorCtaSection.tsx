import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";

export default function InstructorCtaSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="relative rounded-xl overflow-hidden shadow-editorial reveal reveal-scale">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-[#3b82f6]/20 blur-3xl" />
        </div>
        <div className="relative px-8 py-16 sm:px-16 text-center space-y-6">
          <AIInsightChip>Share Your Expertise</AIInsightChip>
          <h2 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white max-w-2xl mx-auto leading-tight">
            Ready to Build the Bridge?
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed font-body">
            Join thousands of world-class instructors bringing knowledge to life
            with AI-powered tools, real-time analytics, and a global audience of
            eager learners.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link to="/login" search={{ next: undefined }}>
              <Button
                size="lg"
                className="bg-white text-m3-primary hover:bg-white/90 border-0 gap-2 px-8 h-12 font-semibold hover-entity"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
