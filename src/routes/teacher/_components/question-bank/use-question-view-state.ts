import { useRef, useState } from "react";

/**
 * Local view-state hooks for the Question Bank, extracted from the former
 * 2.4k-line question-bank.tsx. Each owns one cluster of pure UI state — no
 * server state, no data fetching.
 */

/**
 * Compact/density mode: tighter cards + hidden metadata rows for fast triage
 * of large banks. Persisted to localStorage so the choice sticks per teacher.
 */
export function useCompactMode() {
  const [compact, setCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qbank.compact") === "1";
    } catch {
      return false;
    }
  });
  function toggleCompact() {
    setCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("qbank.compact", next ? "1" : "0");
      } catch {
        // ignore storage failures (private mode etc.)
      }
      return next;
    });
  }
  return { compact, toggleCompact };
}

/** Expand / collapse of the per-card answer bodies. */
export function useExpandedRows() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function collapseAll() {
    setExpanded(new Set());
  }
  return { expanded, setExpanded, toggleExpanded, collapseAll };
}

/** Screen-reader live region for status/reorder announcements. */
export function useLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const announce = (msg: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = msg;
  };
  return { liveRegionRef, announce };
}
