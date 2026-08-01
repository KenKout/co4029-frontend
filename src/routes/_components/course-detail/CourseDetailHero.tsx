import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GraduationCap, Sparkles } from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import type { CoursePublic, TagPublic } from "@/lib/api/types";
import { InstructorLine } from "./InstructorLine";

/**
 * The page header: breadcrumb, AI chip, title, description, module count,
 * instructor line, tag pills and (on large screens) the CTA card.
 */
export function CourseDetailHero({
  course,
  moduleCount,
  tags,
  ctaCard,
}: {
  course: CoursePublic;
  moduleCount: number;
  tags: TagPublic[] | undefined;
  ctaCard: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden border-b border-m3-outline-variant/20 pb-10 pt-2">
      <div className="max-w-6xl mx-auto">
        <nav className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-6">
          <Link
            to="/courses"
            className="hover:text-m3-primary transition-colors"
          >
            {t("course_detail.breadcrumb_courses")}
          </Link>
          <span>/</span>
          <span className="text-m3-on-surface truncate">{course.title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <div className="flex-1 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <AIInsightChip className="bg-m3-primary/10 text-m3-primary border-0">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                {t("course_detail.ai_enhanced")}
              </AIInsightChip>
            </div>

            <h1 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-5xl text-m3-on-surface leading-tight tracking-tight">
              {course.title}
            </h1>

            {course.description && (
              <p className="text-m3-on-surface-variant text-base sm:text-lg leading-relaxed max-w-2xl">
                {course.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-5 text-sm text-m3-on-surface-variant">
              {moduleCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  {t("course_detail.modules_count", { count: moduleCount })}
                </span>
              )}
            </div>

            <InstructorLine instructor={course.instructor ?? null} />

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full bg-m3-primary/8 border border-m3-primary/15 text-m3-primary text-xs font-medium"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block w-80 xl:w-88 shrink-0">{ctaCard}</div>
        </div>
      </div>
    </div>
  );
}
