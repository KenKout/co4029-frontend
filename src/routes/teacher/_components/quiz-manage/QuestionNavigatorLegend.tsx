import { useTranslation } from "react-i18next";
import { PreviewCard } from "@base-ui/react/preview-card";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The status legend is a hover popover on the title rather than a block under
 * the grid: six swatches of permanent chrome crowded the sticky sidebar, and
 * it's reference material you consult once, not something you need on screen
 * continuously. Extracted from QuestionNavigator verbatim.
 */
export function QuestionNavigatorLegend() {
  const { t } = useTranslation();

  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        render={
          <h2 className="flex cursor-help items-center gap-1.5 font-headline font-bold text-sm text-m3-on-surface">
            {t("teacher_quiz_manage.question_nav.title")}
            <HelpCircle
              className="h-3.5 w-3.5 text-m3-on-surface-variant"
              aria-hidden="true"
            />
          </h2>
        }
      />
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="right" align="start" sideOffset={10}>
          <PreviewCard.Popup
            className={cn(
              // z-40 to clear the sticky top bar (z-20); the sidebar is the
              // only thing above it (see frontend/AGENTS.md).
              "z-40 w-64 rounded-xl border border-m3-outline-variant/40 bg-m3-surface p-4 shadow-2xl outline-none",
              "transition-all duration-150",
              "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
              "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            )}
          >
            <p className="mb-2.5 font-headline text-sm font-bold text-m3-on-surface">
              {t("teacher_quiz_manage.question_nav.legend_title")}
            </p>
            {/* Single column at a readable size — the old 2-col 10px grid
                was the unreadable part. */}
            <ul className="space-y-2 text-sm text-m3-on-surface-variant">
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded bg-m3-primary" />
                {t("teacher_quiz_manage.question_nav.status_approved")}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="relative h-4 w-4 shrink-0 rounded bg-m3-surface-container-high">
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {t("teacher_quiz_manage.question_nav.status_pending")}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded bg-red-600" />
                {t("teacher_quiz_manage.question_nav.status_error")}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded bg-m3-surface-container-high ring-2 ring-amber-500" />
                {t("teacher_quiz_manage.question_nav.status_unsaved")}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded bg-m3-surface-container-high ring-2 ring-offset-1 ring-m3-primary" />
                {t("teacher_quiz_manage.question_nav.status_focused")}
              </li>
              <li className="flex items-center gap-2.5">
                <span className="relative h-4 w-4 shrink-0 rounded bg-m3-surface-container-high">
                  <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-m3-secondary" />
                </span>
                {t("teacher_quiz_manage.question_nav.status_selected")}
              </li>
            </ul>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
