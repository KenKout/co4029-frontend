import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";

export default function HeroCopy() {
  return (
    <div className="space-y-8 reveal reveal-left">
      <AIInsightChip pulse={false}>
        Instructor-governed learning intelligence
      </AIInsightChip>

      <div className="space-y-5">
        <h1 className="font-headline font-extrabold text-4xl sm:text-5xl xl:text-6xl leading-[1.08] tracking-tight text-white">
          Turn faculty knowledge into
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#bfdbfe] to-[#dbeafe]">
            measurable learning journeys
          </span>
        </h1>
        <p className="text-lg text-white/75 max-w-xl leading-relaxed font-body">
          aBridgeAI connects instructor-owned materials, knowledge graphs,
          learning outcomes, assessments and adaptive practice so every learner
          can build mastery with evidence—not guesswork.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a href="#how-it-works">
          <Button
            size="lg"
            className="gradient-secondary text-white border-0 gap-2 px-7 h-12 font-semibold shadow-lg transition-opacity hover-entity"
          >
            See How It Works
            <ArrowDown className="h-4 w-4" />
          </Button>
        </a>
        <Link to="/courses">
          <Button
            size="lg"
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 px-7 font-semibold hover-entity"
          >
            Explore Learning
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-white/65">
        <span>Faculty-defined outcomes</span>
        <span aria-hidden="true">•</span>
        <span>Instructor review before publication</span>
      </div>
    </div>
  );
}
