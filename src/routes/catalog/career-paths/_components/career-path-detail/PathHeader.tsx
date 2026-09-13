import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CareerPathProgressRead, CareerPathPublic } from "@/lib/api/types";
import { slugGradient } from "@/routes/courses/_components/course-detail/helpers";
import { cn } from "@/lib/utils";

export function CareerPathHeader({
  data,
  enrolled,
  progress,
}: {
  data: CareerPathPublic;
  enrolled: boolean;
  progress: CareerPathProgressRead | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Link to="/catalog/career-paths">
        <Button variant="ghost" size="sm" className="gap-2 -ml-3 mb-4">
          <ArrowLeft className="h-4 w-4" />
          {t("career_path_detail.back")}
        </Button>
      </Link>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br",
            slugGradient(data.slug),
          )}
        >
          {data.thumbnail_url ? (
            <img src={data.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-m3-on-surface tracking-tight">
            {data.name}
          </h1>
          {data.description && (
            <p className="mt-2 text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
              {data.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-m3-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <strong>
                {t("career_path_detail.n_courses", {
                  count: data.courses.length,
                })}
              </strong>
            </span>
            {enrolled && progress && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("career_path_detail.completed_courses", {
                  completed: progress.completed_courses,
                  total: progress.course_count,
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
