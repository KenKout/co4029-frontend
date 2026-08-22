import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { SectionHeader } from "@/components/ui/section-header";
import { AnimatedBentoRow } from "@/components/ui/animated-bento";
import { CreativeArtsTile, SoftwareEngineeringTile } from "./BentoRowOne";
import { DataScienceTile, DigitalBusinessTile } from "./BentoRowTwo";

export default function CategoriesSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="mb-10 space-y-3 reveal reveal-up">
        <AIInsightChip>Explore by Domain</AIInsightChip>
        <SectionHeader
          title="Core Knowledge Hubs"
          subtitle="Dive into structured, AI-curated learning tracks across the most in-demand disciplines."
        />
      </div>

      <div className="flex flex-col gap-4">
        <AnimatedBentoRow defaultFlex={[2, 1]}>
          {/* Software Engineering */}
          <SoftwareEngineeringTile />

          {/* Creative Arts */}
          <CreativeArtsTile />
        </AnimatedBentoRow>

        <AnimatedBentoRow defaultFlex={[1, 2]}>
          {/* Digital Business */}
          <DigitalBusinessTile />

          {/* Data Science */}
          <DataScienceTile />
        </AnimatedBentoRow>
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/courses">
          <Button
            variant="outline"
            className="ghost-border gap-2 font-medium px-6 hover-entity"
          >
            Browse All Categories
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
