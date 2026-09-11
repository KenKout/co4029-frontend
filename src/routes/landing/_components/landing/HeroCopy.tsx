import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HeroCopy() {
  return (
    <div className="space-y-7">
      <p className="flex items-center gap-2 text-sm font-medium text-blue-200">
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        For educators. Built around your knowledge.
      </p>
      <div className="space-y-5">
        <h1 className="font-headline text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl xl:text-6xl">
          Your course materials.
          <span className="mt-2 block text-blue-200">
            A clearer path to learning.
          </span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-blue-100 sm:text-lg">
          Turn teaching materials into connected concepts, practice and
          assessments. Review what AI proposes, then see where students need
          support.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href="#sample-workflow"
          className={cn(
            buttonVariants(),
            "h-12 gap-2 bg-white px-6 font-semibold text-blue-950 hover:bg-blue-50",
          )}
        >
          See a sample workflow <ArrowDown aria-hidden="true" />
        </a>
        <Link
          to="/courses"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 gap-2 border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white",
          )}
        >
          Sign in to explore <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-blue-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Explore the sample without an account. Instructors stay in control.
      </p>
    </div>
  );
}
