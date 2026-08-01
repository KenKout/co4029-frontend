import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";

import type { LessonOption, TranslateFn } from "./types";

/** Page title row plus the shortcut to the at-risk roster. */
export function CohortPageHeader({
  courseId,
  t,
}: {
  courseId: string;
  t: TranslateFn;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <SectionHeader
        title={t("teacher_sr_cohort.title")}
        subtitle={t("teacher_sr_cohort.subtitle")}
      />
      <Link
        to="/teacher/courses/$courseId/at-risk"
        params={{ courseId }}
        className="ml-auto shrink-0 inline-flex items-center gap-2 rounded-xl bg-m3-surface-container-low hover:bg-m3-surface-container-high border border-m3-outline-variant/20 px-3 py-2 text-sm font-semibold text-m3-on-surface transition-colors cursor-pointer"
      >
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="hidden sm:inline">
          {t("teacher_sr_cohort.view_at_risk")}
        </span>
      </Link>
    </div>
  );
}

/** Module — lesson picker driving every panel below it. */
export function LessonPickerCard({
  lessons,
  lessonsLoading,
  selectedLessonId,
  onSelect,
  t,
}: {
  lessons: LessonOption[];
  lessonsLoading: boolean;
  selectedLessonId: string | undefined;
  onSelect: (lessonId: string | undefined) => void;
  t: TranslateFn;
}) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-5 space-y-3">
      <label
        htmlFor="lesson-select"
        className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
      >
        {t("teacher_sr_cohort.lesson_picker_label")}
      </label>
      <Select
        id="lesson-select"
        value={selectedLessonId ?? ""}
        onValueChange={(next) => onSelect(next || undefined)}
        disabled={lessonsLoading || lessons.length === 0}
        placeholder={
          lessonsLoading
            ? t("teacher_sr_cohort.lesson_loading")
            : t("teacher_sr_cohort.lesson_empty")
        }
        options={lessons.map((l) => ({
          value: l.lesson_id,
          label: `${l.module_title} — ${l.lesson_title}`,
        }))}
      />
    </div>
  );
}
