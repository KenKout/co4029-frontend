import { useTranslation } from "react-i18next";
import { Clock, Lock, Send } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FLAG_KEYS, flags } from "./review-options-model";
import type {
  FlagKey,
  ReviewWindowFlags,
  WindowKey,
} from "./review-options-model";

/**
 * One time-window's card in the review-visibility editor. Extracted from
 * ReviewOptionsMatrix verbatim — every checkbox sits directly beside the text it
 * controls, so a row reads as one sentence and needs no cross-referencing.
 */

const WINDOW_ICONS: Record<WindowKey, typeof Send> = {
  immediately_after: Send,
  later_while_open: Clock,
  after_close: Lock,
};

export function ReviewWindowCard({
  win,
  windowFlags,
  onSetWindow,
  onToggle,
}: {
  win: WindowKey;
  windowFlags: ReviewWindowFlags;
  onSetWindow: (next: ReviewWindowFlags) => void;
  onToggle: (flag: FlagKey) => void;
}) {
  const { t } = useTranslation();
  const Icon = WINDOW_ICONS[win];
  const shown = FLAG_KEYS.filter((f) => windowFlags[f]).length;
  const allOn = shown === FLAG_KEYS.length;

  return (
    <fieldset
      // Labelled by the visible heading rather than a duplicate
      // sr-only <legend>, which would announce the window name
      // twice to a screen reader.
      aria-labelledby={`review-${win}-label`}
      className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon
            className="mt-0.5 h-4 w-4 shrink-0 text-m3-primary"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <p
              id={`review-${win}-label`}
              className="text-sm font-semibold text-m3-on-surface"
            >
              {t(`teacher_quiz_manage.settings.review.windows.${win}`)}
            </p>
            <p className="text-[11px] text-m3-on-surface-variant">
              {t(`teacher_quiz_manage.settings.review.window_hints.${win}`)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] tabular-nums text-m3-on-surface-variant">
            {t("teacher_quiz_manage.settings.review.shown_count", {
              shown,
              total: FLAG_KEYS.length,
            })}
          </span>
          <Button variant="ghost"
            type="button"
            onClick={() => onSetWindow(flags(!allOn))}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-m3-primary hover:bg-m3-primary/10"
          >
            {allOn
              ? t("teacher_quiz_manage.settings.review.hide_all")
              : t("teacher_quiz_manage.settings.review.show_all")}
          </Button>
        </div>
      </div>

      {/* Label sits beside its own control, so a row reads as one
          sentence and needs no cross-referencing. */}
      <div className="grid gap-1 sm:grid-cols-2">
        {FLAG_KEYS.map((flag) => {
          const id = `review-${win}-${flag}`;
          return (
            <label
              key={flag}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-m3-surface-container-high"
            >
              <Checkbox
                id={id}
                checked={windowFlags[flag]}
                onCheckedChange={() => onToggle(flag)}
              />
              <span className="text-sm text-m3-on-surface">
                {t(`teacher_quiz_manage.settings.review.flags.${flag}`)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
