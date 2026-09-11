import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Button } from "@/components/ui/button";

export default function InstructorCtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="reveal reveal-scale relative overflow-hidden rounded-xl shadow-editorial">
        <div className="absolute inset-0 gradient-hero" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#3b82f6]/20 blur-3xl" />
        </div>
        <div className="relative space-y-6 px-8 py-16 text-center sm:px-16">
          <AIInsightChip pulse={false}>
            A connected learning environment
          </AIInsightChip>
          <h2 className="mx-auto max-w-3xl font-headline text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Make every course part of a meaningful learning journey
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/70">
            Connect faculty intent, program outcomes, career capabilities and
            student evidence in one shared system.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/login" search={{ next: undefined }}>
              <Button
                size="lg"
                className="hover-entity h-12 gap-2 border-0 bg-white px-8 font-semibold text-m3-primary hover:bg-white/90"
              >
                Sign in to aBridgeAI
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="hover-entity h-12 border-white/25 bg-white/10 px-8 font-semibold text-white hover:bg-white/20"
              >
                Review the workflow
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
