import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type {
  CareerPathCoursePublic,
  CourseProgressSummary,
} from "@/lib/api/types";

export function CourseRow({
  course,
  index,
  progress,
}: {
  course: CareerPathCoursePublic;
  index: number;
  progress?: CourseProgressSummary;
}) {
  const { t } = useTranslation();
  const completion = progress?.completion_percent ?? 0;
  const completed = completion >= 100;

  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="block group"
    >
      <div className="flex items-start gap-4 p-4 rounded-xl bg-card ghost-border hover:shadow-editorial transition-all duration-200 cursor-pointer">
        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-1 leading-snug flex-1">
              {course.title}
            </h3>
            {completed && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-m3-on-surface-variant">
            <span className="font-mono">{course.slug}</span>
            <span
              className={
                course.is_required
                  ? "text-m3-primary font-semibold"
                  : "text-m3-on-surface-variant"
              }
            >
              {course.is_required
                ? t("career_path_detail.course_required")
                : t("career_path_detail.course_optional")}
            </span>
          </div>
          {progress && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant font-bold">
                  {t("career_path_detail.course_progress_label")}
                </span>
                <span className="text-[11px] text-m3-on-surface font-semibold">
                  {Math.round(completion)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-m3-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, completion))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0 mt-2 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
