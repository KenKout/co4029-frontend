import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLandingCopy } from "./use-landing-copy";

export default function GettingStartedSection() {
  const { c } = useLandingCopy();
  return (
    <section
      aria-labelledby="get-started-title"
      className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8"
    >
      <div className="gradient-hero rounded-2xl px-6 py-12 text-center sm:px-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
          {c.cta.kicker}
        </p>
        <h2
          id="get-started-title"
          className="mx-auto mt-4 max-w-2xl font-headline text-3xl font-extrabold leading-tight text-white sm:text-4xl"
        >
          {c.cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-blue-100">
          {c.cta.body}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/courses"
            className={cn(
              buttonVariants(),
              "h-12 gap-2 bg-white px-7 font-semibold text-blue-950 hover:bg-blue-50",
            )}
          >
            {c.cta.explore} <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            to="/help"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 border-white/30 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white",
            )}
          >
            {c.cta.help}
          </Link>
        </div>
        <p className="mt-5 text-xs text-blue-200">{c.cta.note}</p>
      </div>
    </section>
  );
}
