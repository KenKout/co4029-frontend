import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";

import { DEFAULT_EXPECTED_SECONDS } from "./helpers";
import { Button } from "@/components/ui/button";

/**
 * The three status banners above the question list. Extracted from QuestionsTab
 * verbatim.
 *
 * Expected response time is required. Two DISTINCT situations, and conflating
 * them is what made the old copy misleading:
 *
 *   (a) unsaved default — the editor pre-filled DEFAULT_EXPECTED_SECONDS so the
 *       field LOOKS populated, but the row is still null. Nothing is "missing";
 *       the teacher just needs to Save. Actionable, not an error, and offers a
 *       one-click bulk Save.
 *   (b) genuinely blank — no value on the row AND none in the editor (e.g. the
 *       teacher cleared it). This blocks publishing.
 */
export function QuestionsTabBanners({
  totalQuestions,
  unsavedDefaultTimeCount,
  blankExpectedTimeCount,
  pendingCount,
  savingDefaults,
  onSaveDefaultTimes,
}: {
  totalQuestions: number;
  unsavedDefaultTimeCount: number;
  blankExpectedTimeCount: number;
  pendingCount: number;
  savingDefaults: boolean;
  onSaveDefaultTimes: () => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <>
      {totalQuestions > 0 && unsavedDefaultTimeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 min-w-[12rem]">
            {t("teacher_quiz_manage.banners.unsaved_default_time", {
              count: unsavedDefaultTimeCount,
              seconds: DEFAULT_EXPECTED_SECONDS,
            })}
          </span>
          <Button variant="ghost"
            type="button"
            onClick={onSaveDefaultTimes}
            disabled={savingDefaults}
            className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {savingDefaults ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              t("teacher_quiz_manage.banners.save_default_time")
            )}
          </Button>
        </div>
      )}

      {totalQuestions > 0 && blankExpectedTimeCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("teacher_quiz_manage.banners.missing_expected_time", {
              count: blankExpectedTimeCount,
            })}
          </span>
        </div>
      )}

      {totalQuestions > 0 && pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("teacher_quiz_manage.banners.pending_review", {
              count: pendingCount,
            })}
          </span>
        </div>
      )}
    </>
  );
}
