import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Course } from "@/lib/api/types";
import { slugGradient } from "@/routes/courses/_components/course-detail/helpers";
import { cn } from "@/lib/utils";

export default function CourseProgressCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      aria-label={t("dashboard.open_course_named", { title: course.title })}
      className="group bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border p-6 flex flex-col gap-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/60"
    >
      <div
        className={cn(
          "relative h-32 rounded-xl overflow-hidden bg-gradient-to-br flex items-center justify-center",
          slugGradient(course.slug),
        )}
      >
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <GraduationCap className="h-10 w-10 text-white/60" />
        )}
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-m3-secondary-fixed text-m3-on-secondary-fixed border-0 text-xs font-medium">
            {t("dashboard.enrolled_badge")}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        <h3 className="font-headline font-semibold text-m3-on-surface text-base leading-snug">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-xs text-m3-on-surface-variant line-clamp-2">
            {course.description}
          </p>
        )}
      </div>

      <span className="inline-flex items-center gap-2 gradient-primary text-white rounded-xl font-semibold px-4 py-2 text-sm shadow-glass transition-opacity group-hover:opacity-90 self-start">
        {t("dashboard.open_course")}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
