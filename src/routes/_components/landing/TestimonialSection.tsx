import { Quote } from "lucide-react";
import TestimonialVisual from "./TestimonialVisual";

export default function TestimonialSection() {
  return (
    <section className="bg-[#1e1b4b] py-24 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[#1d4ed8]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#1e3a8a]/20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 reveal reveal-left">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <Quote className="w-6 h-6 text-white" />
            </div>
            <blockquote>
              <p className="font-headline font-bold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
                &ldquo;aBridgeAI didn&apos;t just teach me to code — it taught
                me{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bfdbfe] to-[#dbeafe]">
                  how to think like an engineer.
                </span>{" "}
                The AI insights were game-changing.&rdquo;
              </p>
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full gradient-secondary flex items-center justify-center shrink-0 ring-2 ring-[#1d4ed8]/40">
                <span className="font-headline font-bold text-white text-lg">
                  JR
                </span>
              </div>
              <div>
                <p className="font-headline font-semibold text-white">
                  James Rivera
                </p>
                <p className="text-sm text-white/50">
                  Senior Engineer @ Meta &nbsp;·&nbsp; aBridgeAI Graduate
                </p>
              </div>
            </div>

            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-yellow-400 text-xl">
                  ★
                </span>
              ))}
            </div>
          </div>

          <TestimonialVisual />
        </div>
      </div>
    </section>
  );
}
