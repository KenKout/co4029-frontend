import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GettingStartedSection() {
  return (
    <section
      aria-labelledby="get-started-title"
      className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8"
    >
      <div className="gradient-hero rounded-2xl px-6 py-12 text-center sm:px-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
          Take the next step
        </p>
        <h2
          id="get-started-title"
          className="mx-auto mt-4 max-w-2xl font-headline text-3xl font-extrabold leading-tight text-white sm:text-4xl"
        >
          Find your next learning opportunity.
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-blue-100">
          Sign in to browse available courses and see what they cover. Need help
          with your account or course access? Start with our guide.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/courses"
            className={cn(
              buttonVariants(),
              "h-12 gap-2 bg-white px-7 font-semibold text-blue-950 hover:bg-blue-50",
            )}
          >
            Sign in to explore <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            to="/help"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 border-white/30 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white",
            )}
          >
            Getting started help
          </Link>
        </div>
        <p className="mt-5 text-xs text-blue-200">
          Course access depends on enrollment and organizational permissions.
        </p>
      </div>
    </section>
  );
}
