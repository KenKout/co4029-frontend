/**
 * Workspace navigation for the interview-config page: the tab bar and the
 * publish-readiness checklist that sits under it.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 4 of that file's
 * decomposition). They travel together because both are driven by the same
 * `TabId` and both exist to move the teacher to the right tab — the checklist
 * rows are shortcuts into the tabs the bar renders.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";

import type { SectionNavItem } from "@/components/ui/section-nav";
import type { TabId } from "@/lib/interview/config-draft";
import { cn } from "@/lib/utils";

// Tabbed navigation for the interview-config workspace. Replaces the old
// scroll-spy SectionNav: clicking a tab swaps which panel is shown (panels
// stay mounted, hidden via `hidden`, so state/edits survive). Reuses the
// SectionNavItem status model to render a small per-tab status affix.
export function TabBar({
  items,
  activeTab,
  onSelect,
  ariaLabel,
}: {
  items: SectionNavItem[];
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  ariaLabel: string;
}) {
  function statusDot(status: SectionNavItem["status"]) {
    const kind = status?.kind ?? "none";
    if (kind === "completed")
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
      );
    if (kind === "warning")
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          aria-hidden="true"
        />
      );
    if (kind === "info")
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-m3-secondary"
          aria-hidden="true"
        />
      );
    return null;
  }

  // Sliding colored indicator: an absolutely-positioned pill that measures the
  // active tab's offset/width and animates to it via CSS transform, so the
  // color glides between sections instead of snapping. Recomputed on tab
  // change, container resize, and font/label (language) changes.
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    function measure() {
      const el = tabRefs.current.get(activeTab);
      const list = listRef.current;
      if (!el || !list) return;
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    }
    measure();
    const list = listRef.current;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (ro && list) {
      ro.observe(list);
      for (const el of tabRefs.current.values()) ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeTab, items]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky z-10 -mx-1 px-1"
      style={{ top: 64 }}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className="relative flex items-stretch gap-1 overflow-x-auto no-scrollbar rounded-lg border border-border bg-white/95 p-1 shadow-sm backdrop-blur-sm lg:overflow-visible"
      >
        {/* The sliding pill — sits behind the tab labels and glides to the
            active tab. Hidden until first measured to avoid a flash at 0,0. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1 bottom-1 rounded-md bg-m3-primary shadow-sm ring-1 ring-m3-primary",
            "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out",
            indicator.ready ? "opacity-100" : "opacity-0",
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
        {items.map((item) => {
          const isActive = item.id === activeTab;
          const status = item.status ?? { kind: "none" as const };
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              ref={(el) => {
                if (el) tabRefs.current.set(item.id, el);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={item.id}
              onClick={() => onSelect(item.id as TabId)}
              className={cn(
                "group relative z-10 min-w-fit flex-1 rounded-md px-3 py-2 text-center transition-colors duration-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "whitespace-nowrap cursor-pointer",
                // Text color switches with the sliding pill; the pill itself
                // provides the colored background.
                isActive
                  ? "text-white"
                  : "text-m3-on-surface hover:bg-surface-muted",
              )}
            >
              {/* Two stacked rows: the tab name (with its status dot) on top,
                  and the sub-status affix (e.g. "Completed" / "None yet")
                  centered on a SECOND line beneath it so the name stays the
                  visual anchor and the status reads as a caption. */}
              <span className="flex flex-col items-center justify-center gap-0.5">
                <span className="flex items-center justify-center gap-2">
                  {statusDot(status)}
                  <span className="text-[13px] font-bold">
                    <span className="lg:hidden xl:inline">{item.label}</span>
                    <span className="hidden lg:inline xl:hidden">
                      {item.shortLabel ?? item.label}
                    </span>
                  </span>
                </span>
                {status.kind !== "none" && (
                  <span
                    className={cn(
                      "text-[11px] leading-tight transition-colors duration-300",
                      isActive ? "text-white/80" : "text-m3-on-surface-variant",
                    )}
                  >
                    {status.label}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Compact "ready to publish" checklist shown above the panels while a config
// is still a draft. Surfaces the exact publish gates (settings title, ≥1
// outcome, ≥1 approved question) right where the Publish button lives, so the
// teacher sees what's missing instead of hitting a disabled-button tooltip.
// Each unmet item links to its tab.
export function PublishReadiness({
  settingsComplete,
  outcomeCount,
  approvedCount,
  draftCount,
  onGoTo,
}: {
  settingsComplete: boolean;
  outcomeCount: number;
  approvedCount: number;
  draftCount: number;
  onGoTo: (id: TabId) => void;
}) {
  const { t } = useTranslation();
  const items: {
    key: string;
    done: boolean;
    label: string;
    tab: TabId;
  }[] = [
    {
      key: "settings",
      done: settingsComplete,
      label: t("teacher_interview_config.publish_readiness.settings"),
      tab: "settings",
    },
    {
      key: "outcomes",
      done: outcomeCount > 0,
      label: t("teacher_interview_config.publish_readiness.outcomes", {
        count: outcomeCount,
      }),
      tab: "settings",
    },
    {
      key: "questions",
      done: approvedCount > 0,
      label: t("teacher_interview_config.publish_readiness.questions", {
        approved: approvedCount,
        total: draftCount,
      }),
      tab: "questions",
    },
  ];
  const allDone = items.every((i) => i.done);
  // Which items flipped false→true since the last render. Used to pop ONLY the
  // tick that just became done: animating on `item.done` alone would replay the
  // bounce on every re-render (i.e. on every keystroke in the settings form).
  const justCompleted = useJustCompleted(items);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        allDone
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-amber-200 bg-amber-50/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-m3-on-surface">
          {allDone ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          )}
          {allDone
            ? t("teacher_interview_config.publish_readiness.ready")
            : t("teacher_interview_config.publish_readiness.title")}
        </span>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onGoTo(item.tab)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer",
                  item.done
                    ? "text-emerald-700 hover:bg-emerald-100"
                    : "text-amber-800 hover:bg-amber-100",
                )}
              >
                {item.done ? (
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      justCompleted.has(item.key) &&
                        "motion-safe:animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)_both]",
                    )}
                    aria-hidden="true"
                  />
                ) : (
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Keys of checklist items that flipped from not-done to done since the previous
 * render, so a completion can be acknowledged exactly once.
 *
 * A ref (not state) on purpose: this derives from props the parent already
 * re-renders on, so storing it in state would add a second render pass for no
 * benefit. Items are compared by key, so reordering the checklist is safe.
 */
function useJustCompleted(
  items: { key: string; done: boolean }[],
): Set<string> {
  const prev = useRef<Map<string, boolean>>(new Map());
  const justCompleted = new Set<string>();
  for (const item of items) {
    if (item.done && prev.current.get(item.key) === false) {
      justCompleted.add(item.key);
    }
  }
  prev.current = new Map(items.map((i) => [i.key, i.done]));
  return justCompleted;
}
