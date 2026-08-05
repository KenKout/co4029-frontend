import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useCourse } from "@/lib/api/hooks/courses";
import {
  useCohortKr,
  useDifficultCards,
} from "@/lib/api/hooks/spaced-repetition";

import { CohortKrSection } from "./_components/sr-cohort/CohortKrSection";
import {
  CohortPageHeader,
  LessonPickerCard,
} from "./_components/sr-cohort/CohortPageHeader";
import { DifficultCardsSection } from "./_components/sr-cohort/DifficultCardsSection";
import { useAllLessonsForCourse } from "./_components/sr-cohort/use-all-lessons";

/**
 * Cohort spaced-repetition view for one lesson: knowledge-retention histogram
 * plus the hardest questions, each expandable to a per-student breakdown.
 *
 * The lesson fan-out query, the chart and both sections live in
 * `./_components/sr-cohort/`; this file is the composition shell.
 */
export default function TeacherSrCohortPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useCourse(courseId);
  const { lessons, isLoading: lessonsLoading } =
    useAllLessonsForCourse(courseId);

  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!selectedLessonId && lessons.length > 0) {
      setSelectedLessonId(lessons[0].lesson_id);
    }
  }, [lessons, selectedLessonId]);

  const { data: cohort, isLoading: cohortLoading } = useCohortKr(
    courseId,
    selectedLessonId,
  );
  const { data: difficult, isLoading: difficultLoading } = useDifficultCards(
    courseId,
    selectedLessonId,
    10,
  );

  const selectedLesson = lessons.find((l) => l.lesson_id === selectedLessonId);
  const histogramTotal =
    cohort?.histogram?.reduce((acc, b) => acc + b.count, 0) ?? 0;

  return (
    <div className="min-h-screen pb-12">
      <CohortPageHeader courseId={courseId} t={t} />

      {/* ── 12-col grid: histogram + difficult cards main, sticky lesson
          picker sidebar. The picker drives every panel below it, so it sits
          on the right on wide screens (like the Students tab's sidebar). On
          narrow screens it stacks FIRST (order-1) — if it came after the
          content, users would scroll past the histogram just to switch
          lessons. ── */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 order-2 lg:order-1 space-y-6 min-w-0">
          <CohortKrSection
            cohort={cohort}
            cohortLoading={cohortLoading}
            histogramTotal={histogramTotal}
            selectedLesson={selectedLesson}
            t={t}
          />

          <DifficultCardsSection
            difficult={difficult}
            difficultLoading={difficultLoading}
            courseId={courseId}
            t={t}
          />
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 order-1 lg:order-2 space-y-6 lg:sticky lg:top-24 self-start">
          <LessonPickerCard
            lessons={lessons}
            lessonsLoading={lessonsLoading}
            selectedLessonId={selectedLessonId}
            onSelect={setSelectedLessonId}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
