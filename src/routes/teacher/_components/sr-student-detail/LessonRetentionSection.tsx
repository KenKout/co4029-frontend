import { Brain, Info, Lock } from "lucide-react";

import type { StudentSrDetailLesson } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { STATUS_BADGE, STATUS_KEY, type TranslateFn } from "./constants";

function LessonColumnHeaders({ t }: { t: TranslateFn }) {
  return (
    <div className="hidden sm:grid grid-cols-[1fr_160px_120px_120px_120px] gap-3 px-6 py-2.5 bg-m3-surface-container-low">
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_student_detail.cols.lesson")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant inline-flex items-center gap-1">
        {t("teacher_sr_cohort.kr_axis")}
        <Info
          className="h-3 w-3 text-m3-on-surface-variant/60 cursor-help shrink-0"
          aria-label={t("teacher_sr_cohort.kr_hint")}
          tabIndex={0}
        >
          <title>{t("teacher_sr_cohort.kr_hint")}</title>
        </Info>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_student_detail.cols.cards_total")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_student_detail.cols.cards_due")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_student_detail.cols.status")}
      </span>
    </div>
  );
}

function LessonRow({
  lesson,
  t,
}: {
  lesson: StudentSrDetailLesson;
  t: TranslateFn;
}) {
  const badge = STATUS_BADGE[lesson.status];
  return (
    <div className="grid sm:grid-cols-[1fr_160px_120px_120px_120px] gap-3 px-6 py-3 items-center hover:bg-m3-surface-container-low transition-colors">
      <p className="text-sm font-medium text-m3-on-surface truncate">
        {lesson.lesson_title}
      </p>
      <p className="text-sm font-bold text-m3-primary">
        {(lesson.kr_estimate * 100).toFixed(1)}%
      </p>
      <p className="text-sm text-m3-on-surface-variant">{lesson.cards_total}</p>
      <p
        className={cn(
          "text-sm font-semibold",
          lesson.cards_due_now > 0
            ? "text-amber-600"
            : "text-m3-on-surface-variant",
        )}
      >
        {lesson.cards_due_now}
      </p>
      <span
        className={cn(
          "text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit",
          badge,
        )}
      >
        {t(STATUS_KEY[lesson.status])}
      </span>
    </div>
  );
}

/** Per-lesson retention table for one student. */
export function LessonRetentionSection({
  lessons,
  isLoading,
  t,
}: {
  lessons: StudentSrDetailLesson[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <div className="px-6 py-4 border-b border-m3-outline-variant/20">
        <h2 className="font-heading font-bold text-base text-m3-on-surface flex items-center gap-2">
          <Brain className="h-4 w-4 text-m3-secondary" />
          {t("teacher_sr_student_detail.lessons_title")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {t("teacher_sr_student_detail.lessons_subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
          <Lock className="h-8 w-8 text-m3-on-surface-variant opacity-40" />
          <p className="text-sm font-semibold text-m3-on-surface">
            {t("teacher_sr_student_detail.empty_lessons")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-m3-outline-variant/10">
          <LessonColumnHeaders t={t} />
          {lessons.map((lesson) => (
            <LessonRow key={lesson.lesson_id} lesson={lesson} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
