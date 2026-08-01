import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { BridgeLine } from "@/components/ui/bridge-line";
import { TrendingCarousel } from "@/components/ui/trending-carousel";
import { featuredCourses } from "./constants";

export default function FeaturedCoursesSection() {
  return (
    <section className="bg-m3-surface-container-low py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-2 reveal reveal-up">
          <AIInsightChip className="mb-4">AI-Curated Picks</AIInsightChip>
        </div>
        <div
          className="flex items-center gap-4 mb-10 reveal reveal-up"
          style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
        >
          <h2 className="font-headline font-bold text-2xl lg:text-3xl text-m3-on-surface whitespace-nowrap">
            Trending Now
          </h2>
          <BridgeLine className="flex-1" />
          <Link to="/courses">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-m3-secondary shrink-0 font-medium"
            >
              See All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div
          className="reveal reveal-up"
          style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}
        >
          <TrendingCarousel courses={featuredCourses} />
        </div>
      </div>
    </section>
  );
}
