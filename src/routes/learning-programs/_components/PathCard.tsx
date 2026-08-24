import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, Layers, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningProgramEnrollment } from "@/lib/api/types";

type ProgramPath = LearningProgramEnrollment["paths"][number];

/**
 * One career path inside a program, as a browse card.
 *
 * Deliberately product-card shaped: a student picking a path is comparing
 * options side by side, which is a browsing task, not a form-filling one. So
 * the grid gives each path equal visual weight and surfaces the attributes
 * that actually differentiate them — how many courses, how many are
 * required, how many stages.
 *
 * The card does NOT carry a "choose" button. Committing to a path decides a
 * student's next several months and, once chosen, switching needs a dean's
 * approval — that is not a decision to take from a summary tile. The card
 * links through to the path detail, where the full roadmap is visible, and
 * the commit lives there.
 */
export function PathCard({
  path,
  isCurrent,
  courseCount,
  requiredCount,
  stageCount,
}: {
  path: ProgramPath;
  isCurrent: boolean;
  courseCount?: number;
  requiredCount?: number;
  stageCount?: number;
}) {
  return (
    <Link
      to="/career-paths/$slug"
      params={{ slug: path.slug }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        isCurrent
          ? "border-m3-primary ring-1 ring-m3-primary/30"
          : "border-m3-outline-variant/40",
      )}
    >
      {/* Gradient band stands in for product imagery — a career path has no
          photo, and an empty image slot reads as a broken card. */}
      <div className="relative h-24 gradient-primary">
        {isCurrent ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-m3-primary">
            <CheckCircle2 className="h-3 w-3" />
            Your path
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-headline text-base font-bold text-text-strong">
            {path.name}
          </h3>
          {path.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-text-muted">
              {path.description}
            </p>
          ) : null}
        </div>

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-muted">
          {courseCount !== undefined ? (
            <Attribute icon={BookOpen} label={`${courseCount} courses`} />
          ) : null}
          {requiredCount !== undefined ? (
            <Attribute icon={Star} label={`${requiredCount} required`} />
          ) : null}
          {stageCount ? (
            <Attribute icon={Layers} label={`${stageCount} stages`} />
          ) : null}
        </dl>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-m3-primary">
          View roadmap
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function Attribute({
  icon: Icon,
  label,
}: {
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
