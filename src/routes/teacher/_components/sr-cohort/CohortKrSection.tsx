import { Brain, Info, Users } from "lucide-react";

import type { CohortKrResponse } from "@/lib/api/types";

import { CohortHistogram } from "./CohortHistogram";
import type { LessonOption, TranslateFn } from "./types";

function CohortSectionHeader({
  selectedLesson,
  studentCount,
  t,
}: {
  selectedLesson: LessonOption | undefined;
  studentCount: number;
  t: TranslateFn;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="font-heading font-bold text-lg text-m3-on-surface flex items-center gap-1.5">
          {t("teacher_sr_cohort.histogram_title", {
            lesson: selectedLesson?.lesson_title ?? "—",
          })}
          <Info
            className="h-3.5 w-3.5 text-m3-on-surface-variant/60 cursor-help shrink-0"
            aria-label={t("teacher_sr_cohort.kr_hint")}
            tabIndex={0}
          >
            <title>{t("teacher_sr_cohort.kr_hint")}</title>
          </Info>
        </h2>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_sr_cohort.histogram_subtitle")}
        </p>
      </div>
      <div className="inline-flex items-center gap-2 text-xs font-bold text-m3-primary bg-m3-primary-fixed px-3 py-1.5 rounded-xl shrink-0">
        <Users className="h-3.5 w-3.5" />
        <span>
          {t("teacher_sr_cohort.student_count", { count: studentCount })}
        </span>
      </div>
    </div>
  );
}

function NoKrData({ t }: { t: TranslateFn }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-m3-outline-variant flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
        <Brain className="h-6 w-6 text-m3-primary" />
      </div>
      <p className="text-sm font-semibold text-m3-on-surface">
        {t("teacher_sr_cohort.no_kr_data_title")}
      </p>
      <p className="text-xs text-m3-on-surface-variant max-w-md">
        {t("teacher_sr_cohort.no_kr_data_body")}
      </p>
    </div>
  );
}

function KrStatTiles({
  cohort,
  t,
}: {
  cohort: CohortKrResponse;
  t: TranslateFn;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-m3-outline-variant/10">
      <div className="bg-m3-surface-container-low rounded-xl p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-m3-on-surface-variant font-bold">
          {t("teacher_sr_cohort.stats.mean_kr")}
        </p>
        <p className="text-2xl font-heading font-black text-m3-primary mt-1">
          {(cohort.mean_kr * 100).toFixed(1)}%
        </p>
      </div>
      <div className="bg-m3-surface-container-low rounded-xl p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-m3-on-surface-variant font-bold">
          {t("teacher_sr_cohort.stats.median_kr")}
        </p>
        <p className="text-2xl font-heading font-black text-m3-primary mt-1">
          {(cohort.median_kr * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

/** Cohort knowledge-retention card: header, histogram (or empty), stat tiles. */
export function CohortKrSection({
  cohort,
  cohortLoading,
  histogramTotal,
  selectedLesson,
  t,
}: {
  cohort: CohortKrResponse | undefined;
  cohortLoading: boolean;
  histogramTotal: number;
  selectedLesson: LessonOption | undefined;
  t: TranslateFn;
}) {
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-6 space-y-5">
      <CohortSectionHeader
        selectedLesson={selectedLesson}
        studentCount={cohort?.student_count ?? 0}
        t={t}
      />

      {cohortLoading ? (
        <div className="h-[260px] rounded-xl bg-m3-surface-container-low animate-pulse" />
      ) : !cohort || histogramTotal === 0 ? (
        <NoKrData t={t} />
      ) : (
        <CohortHistogram data={cohort.histogram ?? []} />
      )}

      {cohort && histogramTotal > 0 && <KrStatTiles cohort={cohort} t={t} />}
    </section>
  );
}
