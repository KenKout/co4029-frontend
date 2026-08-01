import { Check, Clock, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { I18nInstance, TranslateFn } from "./types";

/**
 * Save-state indicator beside the submit button — Saving… / Unsaved changes /
 * Saved / Last saved — so the teacher always knows whether their edits are
 * persisted (mirrors the interview-config save UX). Moved verbatim out of
 * `CourseSettingsPanel`.
 */
export function CourseSettingsSaveBar({
  isPending,
  settingsDirty,
  justSaved,
  lastSaved,
  t,
  i18n,
}: {
  isPending: boolean;
  settingsDirty: boolean;
  justSaved: boolean;
  lastSaved: string | null;
  t: TranslateFn;
  i18n: I18nInstance;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-1">
      {isPending ? (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-m3-on-surface-variant"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("teacher_course_settings.save_status.saving")}
        </span>
      ) : settingsDirty ? (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700"
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
          {t("teacher_course_settings.save_status.unsaved")}
        </span>
      ) : justSaved ? (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          {t("teacher_course_settings.save_status.saved")}
        </span>
      ) : lastSaved ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {t("teacher_course_settings.save_status.last_saved", {
            when: new Date(lastSaved).toLocaleString(
              i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
              { dateStyle: "medium", timeStyle: "short" },
            ),
          })}
        </span>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={isPending || !settingsDirty}
        className="gap-2 gradient-primary text-white border-0 shadow-sm"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t("teacher_course_settings.save")}
      </Button>
    </div>
  );
}
