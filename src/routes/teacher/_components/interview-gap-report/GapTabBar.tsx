import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GapTabId } from "./types";

/**
 * Tabbed navigation for the gap-report page, mirroring the interview-config
 * workspace: an absolutely-positioned pill measures the active tab and glides
 * to it via CSS transform, so the colored indicator slides between tabs.
 */
export function GapTabBar({
  activeTab,
  onSelect,
  ariaLabel,
}: {
  activeTab: GapTabId;
  onSelect: (id: GapTabId) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const items: { id: GapTabId; label: string }[] = [
    { id: "overview", label: t("teacher_interview_gap_report.tabs.overview") },
    { id: "analysis", label: t("teacher_interview_gap_report.tabs.analysis") },
    {
      id: "transcript",
      label: t("teacher_interview_gap_report.tabs.transcript"),
    },
    {
      id: "integrity",
      label: t("teacher_interview_gap_report.tabs.integrity"),
    },
  ];

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
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
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
  }, [activeTab]);

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
          return (
            <Button variant="ghost"
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
              onClick={() => onSelect(item.id)}
              className={cn(
                "group relative z-10 min-w-fit flex-1 rounded-md px-3 py-2 text-center transition-colors duration-300 h-auto whitespace-normal",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "whitespace-nowrap cursor-pointer text-[13px] font-bold",
                isActive
                  ? "text-white"
                  : "text-m3-on-surface hover:bg-surface-muted",
              )}
            >
              {item.label}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
