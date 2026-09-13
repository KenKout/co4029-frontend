import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LearningProgramEnrollment } from "@/lib/api/types";
import { slugGradient } from "@/routes/courses/_components/course-detail/helpers";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation();
  const hasAttributes =
    courseCount !== undefined ||
    requiredCount !== undefined ||
    Boolean(stageCount);
  return (
    <Link
      to="/catalog/career-paths/$slug"
      params={{ slug: path.slug }}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-editorial ghost-border transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-glass",
        isCurrent
          ? "border-m3-primary ring-1 ring-m3-primary/30"
          : "border-m3-outline-variant/40",
      )}
    >
      <div className="relative aspect-video shrink-0 overflow-hidden">
        {path.thumbnail_url ? (
          <img
            src={path.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              slugGradient(path.slug),
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {!path.thumbnail_url ? (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 transition-opacity group-hover:opacity-30">
            <GraduationCap className="h-16 w-16 text-white" />
          </div>
        ) : null}
        {isCurrent ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-m3-primary">
            <CheckCircle2 className="h-3 w-3" />
            {t("my_learning_programs.path_card.your_path")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
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

        {hasAttributes ? (
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-muted">
            {courseCount !== undefined ? (
              <Attribute
                icon={BookOpen}
                label={t("my_learning_programs.path_card.courses", {
                  count: courseCount,
                })}
              />
            ) : null}
            {requiredCount !== undefined ? (
              <Attribute
                icon={Star}
                label={t("my_learning_programs.path_card.required", {
                  count: requiredCount,
                })}
              />
            ) : null}
            {stageCount ? (
              <Attribute
                icon={Layers}
                label={t("my_learning_programs.path_card.stages", {
                  count: stageCount,
                })}
              />
            ) : null}
          </dl>
        ) : null}

        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-m3-primary">
          {t("my_learning_programs.path_card.view_roadmap")}
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
