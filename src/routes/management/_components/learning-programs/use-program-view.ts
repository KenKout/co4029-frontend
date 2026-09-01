import { useCallback, useEffect, useState } from "react";

export type ProgramView = "card" | "table";

const STORAGE_KEY = "abridgeai.learning_programs.view";

function isView(value: unknown): value is ProgramView {
  return value === "card" || value === "table";
}

/**
 * Remembers whether the manager last browsed programs as cards or as a
 * table.
 *
 * A view preference is a per-person habit, not shared state, so it lives in
 * localStorage rather than in the URL or on the server. Every read and
 * write is guarded: a private window, cleared site data, or a browser set
 * to block storage all throw on access rather than returning null, and a
 * list page must not fail to render because a preference could not be read.
 *
 * Defaults to cards — the grid is the friendlier first impression, and the
 * table is the deliberate choice you make when comparing.
 */
export function useProgramView(): [ProgramView, (next: ProgramView) => void] {
  const [view, setView] = useState<ProgramView>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return isView(stored) ? stored : "card";
    } catch {
      return "card";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      // Preference is a convenience; losing it must never break the page.
    }
  }, [view]);

  const choose = useCallback((next: ProgramView) => setView(next), []);
  return [view, choose];
}
