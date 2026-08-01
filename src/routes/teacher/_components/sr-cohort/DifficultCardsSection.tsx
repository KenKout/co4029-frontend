import { AlertTriangle, Info, Sparkles } from "lucide-react";

import type { DifficultCardWithPrompt } from "@/lib/api/hooks/spaced-repetition";

import { DifficultCardRow } from "./DifficultCardRow";
import type { TranslateFn } from "./types";

function DifficultSectionHeader({ t }: { t: TranslateFn }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-m3-outline-variant/20">
      <div className="space-y-0.5">
        <h2 className="font-heading font-bold text-lg text-m3-on-surface flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-m3-secondary" />
          {t("teacher_sr_cohort.difficult_title")}
          <Info
            className="h-3.5 w-3.5 text-m3-on-surface-variant/60 cursor-help shrink-0"
            aria-label={t("teacher_sr_cohort.ef_hint")}
            tabIndex={0}
          >
            <title>{t("teacher_sr_cohort.ef_hint")}</title>
          </Info>
        </h2>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_sr_cohort.difficult_subtitle")}
        </p>
      </div>
    </div>
  );
}

function DifficultColumnHeaders({ t }: { t: TranslateFn }) {
  return (
    <div className="hidden sm:grid grid-cols-[24px_1fr_150px_110px_140px] gap-4 px-6 py-2.5 bg-m3-surface-container-low">
      <span />
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_cohort.cols.question")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_cohort.cols.mean_ef")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_cohort.cols.students")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
        {t("teacher_sr_cohort.cols.actions")}
      </span>
    </div>
  );
}

function DifficultEmptyState({ t }: { t: TranslateFn }) {
  return (
    <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
      <AlertTriangle className="h-8 w-8 text-m3-on-surface-variant opacity-40" />
      <p className="text-sm font-semibold text-m3-on-surface">
        {t("teacher_sr_cohort.difficult_empty_title")}
      </p>
      <p className="text-xs text-m3-on-surface-variant">
        {t("teacher_sr_cohort.difficult_empty_body")}
      </p>
    </div>
  );
}

/** Top-10 hardest questions for the selected lesson, each row expandable. */
export function DifficultCardsSection({
  difficult,
  difficultLoading,
  courseId,
  t,
}: {
  difficult: DifficultCardWithPrompt[] | undefined;
  difficultLoading: boolean;
  courseId: string;
  t: TranslateFn;
}) {
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <DifficultSectionHeader t={t} />

      {difficultLoading ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : !difficult || difficult.length === 0 ? (
        <DifficultEmptyState t={t} />
      ) : (
        <div className="divide-y divide-m3-outline-variant/10">
          <DifficultColumnHeaders t={t} />
          {difficult.map((card) => (
            <DifficultCardRow
              key={card.question_id}
              card={card}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
