import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import type { SettingsDraft } from "./use-settings-draft";

/**
 * Sticky bar shown while edits are staged but not applied.
 *
 * Its existence is the honest signal the page previously lacked: with
 * auto-save there was no moment at which the form was "dirty", so nothing
 * could tell an operator that the deployment did or did not yet reflect what
 * they were looking at. Discard is given equal weight to Apply — backing out
 * should be as easy as going forward.
 */
export function PendingChangesBar({
  draft,
  onReview,
}: {
  draft: SettingsDraft;
  onReview: () => void;
}) {
  const { t } = useTranslation();
  if (!draft.isDirty) return null;

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-m3-primary/40 bg-card px-5 py-3 shadow-lg">
      <p className="text-sm font-semibold text-text-strong">
        {t("admin_settings.pending.count", { count: draft.count })}
        <span className="ml-2 font-normal text-text-muted">
          {t("admin_settings.pending.not_applied")}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={draft.discardAll}>
          {t("admin_settings.pending.discard")}
        </Button>
        <Button onClick={onReview}>{t("admin_settings.pending.review")}</Button>
      </div>
    </div>
  );
}
