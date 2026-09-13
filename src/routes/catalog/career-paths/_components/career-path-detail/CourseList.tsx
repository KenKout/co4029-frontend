import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import type {
  CareerPathCoursePublic,
  CourseProgressSummary,
} from "@/lib/api/types";
import { CourseListRow } from "@/routes/courses/_components/courses-list/CourseListRow";
import { RequirementTag } from "./StageRoadmap";
import { CourseProgressMeta } from "./CourseRow";

export function CareerPathCourseList({
  courses,
  progressByCourseId,
}: {
  courses: CareerPathCoursePublic[];
  progressByCourseId: Map<string, CourseProgressSummary>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-4">
      <SectionHeader
        title={t("career_path_detail.section_title")}
        subtitle={t("career_path_detail.section_subtitle")}
      />
      {courses.length === 0 ? (
        <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
          <p className="text-sm text-m3-on-surface-variant">
            {t("career_path_detail.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((c, i) => (
            <CourseListRow
              key={c.course_id}
              course={c}
              leading={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed font-headline text-sm font-bold text-m3-primary">
                  {i + 1}
                </span>
              }
              meta={
                <>
                  <RequirementTag required={c.is_required} />
                  <CourseProgressMeta
                    progress={progressByCourseId.get(c.course_id)}
                  />
                </>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
