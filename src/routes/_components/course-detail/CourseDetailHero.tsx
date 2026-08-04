import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Bot, Sparkles } from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import type { CoursePublic, TagPublic } from "@/lib/api/types";

/**
 * The page header: breadcrumb, AI chip, title, full-width description, the
 * AI mock-interview teaser line and tag pills. The CTA card lives in its own
 * sticky rail (CtaCard), not inside this hero.
 */
export function CourseDetailHero({
  course,
  tags,
}: {
  course: CoursePublic;
  tags: TagPublic[] | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden border-b border-m3-outline-variant/20 pb-4">
      <div className="w-full">
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

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <AIInsightChip className="bg-m3-primary/10 text-m3-primary border-0">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              {t("course_detail.ai_enhanced")}
            </AIInsightChip>
          </div>

          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-5xl text-m3-on-surface leading-tight tracking-tight">
            {course.title}
          </h1>

          {/* Full-width description; long words/URLs wrap instead of
              overflowing the column. */}
          {course.description && (
            <p className="text-m3-on-surface-variant text-base sm:text-lg leading-relaxed w-full break-words">
              {course.description}
            </p>
          )}

          {/* AI mock-interview teaser, one tight line (was a full card at
              the bottom of the page; the wireframe wants it in the hero). */}
          <div className="flex items-center gap-2 text-sm font-medium text-m3-secondary">
            <Bot className="h-4 w-4 shrink-0" />
            {t("course_detail.ai_mock_hero_line")}
          </div>

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
      </div>
    </div>
  );
}
