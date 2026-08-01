import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Typewriter } from "@/components/ui/typewriter";

export default function HeroCopy() {
  return (
    <div className="space-y-8 reveal reveal-left">
      <AIInsightChip>Next-Gen Learning Platform</AIInsightChip>

      <div className="space-y-5">
        <h1 className="font-headline font-extrabold text-4xl sm:text-5xl xl:text-6xl leading-[1.08] tracking-tight text-white min-h-[90px] sm:min-h-[110px] xl:min-h-[130px]">
          <Typewriter text="The Bridge to" speed={45} delay={200} />
          <br />
          <Typewriter
            text="Human Mastery"
            speed={55}
            delay={1000}
            className="text-transparent bg-clip-text bg-gradient-to-r from-[#bfdbfe] to-[#dbeafe]"
          />
        </h1>
        <div className="min-h-[85px]">
          <Typewriter
            text="Unlock your potential with AI-powered courses crafted by world-class instructors. Personalised learning paths that adapt to you — at every step of the journey."
            speed={20}
            delay={1800}
            className="text-lg text-white/70 max-w-md leading-relaxed font-body"
            cursor={true}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/courses">
          <Button
            size="lg"
            className="gradient-secondary text-white border-0 gap-2 px-7 h-12 font-semibold shadow-lg transition-opacity hover-entity"
          >
            Start Your Path
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/courses">
          <Button
            size="lg"
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 px-7 font-semibold hover-entity"
          >
            View Courses
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <div className="flex -space-x-2">
          {[
            { bg: "#1e3a8a", label: "A" },
            { bg: "#1d4ed8", label: "M" },
            { bg: "#1e40af", label: "S" },
            { bg: "#3b82f6", label: "J" },
          ].map(({ bg, label }, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ background: bg }}
            >
              {label}
            </div>
          ))}
        </div>
        <p className="text-sm text-white/60 font-body">
          Joined by <span className="text-white font-semibold">500,000+</span>{" "}
          learners worldwide
        </p>
      </div>
    </div>
  );
}
