import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * One save for the whole quiz, replacing a Save button on every card.
 *
 * Each question owned its own Save, so committing a reviewed twenty-question
 * quiz meant twenty separate clicks down a 19,000px page — and nothing above
 * the fold said which cards were still pending. The count here is the same
 * `dirtyIds` set the navigator already tracks, so the bar and the per-card
 * "Unsaved" badges cannot disagree.
 *
 * It sticks to the bottom of the viewport only while there is something to
 * save; a permanently parked bar would eat 56px of every screen for a state
 * that is usually empty.
 */
export function QuestionsSaveBar({
  dirtyCount,
  saving,
  onSaveAll,
  onDiscard,
}: {
  dirtyCount: number;
  saving: boolean;
  onSaveAll: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();

  if (dirtyCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-20">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 shadow-editorial">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
        />
        <p className="text-sm text-m3-on-surface">
          {t("teacher_quiz_manage.save_bar.pending", { count: dirtyCount })}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDiscard}
            disabled={saving}
          >
            {t("teacher_quiz_manage.save_bar.discard")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSaveAll}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t("teacher_quiz_manage.save_bar.save_all")}
          </Button>
        </div>
      </div>
    </div>
  );
}
