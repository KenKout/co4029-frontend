import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { CardStudentResult } from "@/lib/api/hooks/spaced-repetition";
import { useRelDate } from "@/lib/format/date";

import type { TranslateFn } from "./types";

function LastResultCell({
  result,
  t,
}: {
  result: CardStudentResult;
  t: TranslateFn;
}) {
  return (
    <span className="flex justify-center">
      {result.last_correct == null ? (
        <span className="text-xs text-m3-on-surface-variant">—</span>
      ) : result.last_correct ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("teacher_sr_cohort.detail.correct")}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          {t("teacher_sr_cohort.detail.incorrect")}
        </span>
      )}
    </span>
  );
}

function ResultsHeaderRow({ t }: { t: TranslateFn }) {
  return (
    <div className="grid grid-cols-[1fr_90px_110px_120px] gap-3 px-4 py-2 bg-m3-surface-container-low">
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_sr_cohort.detail.student")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-center">
        {t("teacher_sr_cohort.detail.last_result")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-center">
        {t("teacher_sr_cohort.detail.accuracy")}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
        {t("teacher_sr_cohort.detail.last_reviewed")}
      </span>
    </div>
  );
}

/** Per-student breakdown for one question (weakest first). */
export function CardStudentResultsPanel({
  results,
  loading,
}: {
  results: CardStudentResult[] | undefined;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const relDate = useRelDate();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-sm text-m3-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("teacher_sr_cohort.detail.loading")}
      </div>
    );
  }
  if (!results || results.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-m3-on-surface-variant">
        {t("teacher_sr_cohort.detail.empty")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <ResultsHeaderRow t={t} />
      <div className="divide-y divide-m3-outline-variant/10">
        {results.map((r) => (
          <div
            key={r.student_id}
            className="grid grid-cols-[1fr_90px_110px_120px] gap-3 px-4 py-2.5 items-center"
          >
            <span
              className="text-sm text-m3-on-surface truncate"
              title={r.name}
            >
              {r.name}
            </span>
            <LastResultCell result={r} t={t} />
            <span className="text-xs text-m3-on-surface-variant text-center tabular-nums">
              {r.review_count > 0
                ? t("teacher_sr_cohort.detail.accuracy_value", {
                    correct: r.correct_count,
                    total: r.review_count,
                  })
                : "—"}
            </span>
            <span className="text-xs text-m3-on-surface-variant text-right">
              {relDate(r.last_reviewed_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
