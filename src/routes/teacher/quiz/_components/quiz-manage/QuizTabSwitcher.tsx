import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { TabKey } from "@/routes/teacher/_components/quiz-manage/types";

import { TAB_ICONS, TAB_KEYS } from "./constants";

/**
 * Tab switcher. Not stuck → horizontal pills with text labels, in-flow.
 * Stuck → animates into a vertical, icon-only rail parked in the left gutter
 * (absolute, so it respects the sidebar margin via its in-flow parent and
 * never covers the center content), sliding in from the left with tooltips for
 * each tab.
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function QuizTabSwitcher({
  tab,
  actionsStuck,
  onSelect,
}: {
  tab: TabKey;
  actionsStuck: boolean;
  onSelect: (key: TabKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out inline-flex gap-1 rounded-xl p-1",
        actionsStuck
          ? // Stays in-flow inside the solid toolbar band — icon-only to
            // stay compact, but horizontal and never floating over content.
            "border border-transparent"
          : "border border-m3-outline-variant/20 bg-m3-surface-container-low shadow-lg shadow-m3-primary/5",
      )}
    >
      {TAB_KEYS.map((key) => {
        const active = key === tab;
        const Icon = TAB_ICONS[key];
        const label = t(`teacher_quiz_manage.tabs.${key}`);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={active}
            aria-label={label}
            title={actionsStuck ? label : undefined}
            className={cn(
              "rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center border",
              actionsStuck ? "h-10 w-10" : "px-4 py-2 text-sm gap-2",
              // Active tab: in the stuck rail it needs a solid blue fill
              // with a WHITE icon + gray border so it doesn't blend into
              // the content showing through behind the rail. In the
              // normal (not-stuck) strip it keeps the subtle pill look.
              active
                ? actionsStuck
                  ? "bg-m3-primary text-white border-m3-outline-variant/40 shadow-sm"
                  : "bg-surface-elev text-m3-primary border-transparent shadow-sm"
                : "border-transparent text-m3-on-surface-variant hover:text-m3-primary/80",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!actionsStuck && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
