import { useMemo, useState } from "react";
import { FAQ_ENTRIES, type FaqCategory } from "@/lib/help-content";

/**
 * FAQ search + accordion state.
 *
 * Hook order matches the order the former inline `HelpPage` used
 * (useState → useState → useMemo → useMemo).
 *
 * Search filters across question and answer text so a user who doesn't know the
 * right vocabulary ("EF", "spaced repetition") can still find the entry by
 * describing the symptom.
 */
export function useFaqSearch() {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const trimmed = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmed) return FAQ_ENTRIES;
    return FAQ_ENTRIES.filter(
      (e) =>
        e.question.toLowerCase().includes(trimmed) ||
        e.answer.toLowerCase().includes(trimmed),
    );
  }, [trimmed]);

  const grouped = useMemo(() => {
    const map = new Map<FaqCategory, typeof FAQ_ENTRIES>();
    for (const entry of matches) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return map;
  }, [matches]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // While searching, expand everything: the user is scanning for a phrase and
  // shouldn't have to click each result open to see whether it's the right one.
  const isSearching = trimmed.length > 0;

  return { query, setQuery, matches, grouped, toggle, openIds, isSearching };
}
