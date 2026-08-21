import { Sparkles, GraduationCap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default function HeroVisual() {
  return (
    <div
      className="relative flex items-center justify-center reveal reveal-right"
      style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}
    >
      <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#172554] via-[#1e40af] to-[#3b82f6]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-20 h-20 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <div className="text-center">
            <p className="text-white font-headline font-bold text-xl">
              AI Curriculum
            </p>
            <p className="text-white/60 text-sm mt-1">
              Personalised to your goals
            </p>
          </div>
          <div className="w-full space-y-2">
            {[80, 65, 90].map((w, i) => (
              <div
                key={i}
                className="h-1.5 bg-white/10 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#bfdbfe] to-[#3b82f6] rounded-full"
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1860]/60 via-transparent to-transparent" />
      </div>

      {/* Floating AI insight card */}
      <div className="absolute -bottom-6 -left-4 sm:-left-10 z-10 animate-float hover-entity">
        <GlassCard className="p-4 w-56 shadow-glass">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-m3-on-surface">
                AI Insight
              </p>
              <p className="text-xs text-m3-on-surface-variant mt-0.5 leading-snug">
                Next skill gap:{" "}
                <span className="text-m3-secondary font-semibold">
                  TypeScript Generics
                </span>
              </p>
              <div className="mt-2 h-1 bg-m3-surface-container rounded-full overflow-hidden">
                <div className="h-full w-2/3 gradient-secondary rounded-full animate-pulse-slow" />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Top-right stat badge */}
      <div
        className="absolute -top-4 -right-2 sm:right-0 animate-float"
        style={{ animationDelay: "3s" }}
      >
        <div className="glass ghost-border shadow-glass rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-headline font-extrabold text-m3-primary">
            94%
          </p>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            Accuracy
          </p>
        </div>
      </div>
    </div>
  );
}
