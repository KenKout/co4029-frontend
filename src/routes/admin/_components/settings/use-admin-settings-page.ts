import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useRuntimeSettings,
  type RuntimeSetting,
} from "@/lib/api/hooks/admin-settings";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";
import { GROUP_ORDER, HEADER_OFFSET, SPY_TOLERANCE } from "./constants";
import { matchesSearchQuery } from "./helpers";
import { useSettingsDraft } from "./use-settings-draft";

// View-mode toggles survive reload/navigation — same pattern as the course
// catalogue's `courses:viewMode`.
const DENSE_KEY = "admin-settings:viewMode";

/**
 * Stateful half of the admin runtime-settings page: scope + filter state, the
 * org and settings queries, the grouped/counted derivations and the section
 * scroll-spy.
 *
 * Hook order matches the original inline `AdminSettingsPage` exactly —
 * useTranslation, the six state slots, useOrganizations, useRuntimeSettings,
 * the grouped memo, the overrideCounts memo, the content ref, the scroll-spy
 * effect — so the page component keeps its identical render behaviour.
 */
export function useAdminSettingsPage() {
  const { t } = useTranslation();
  // "" is the global scope; a uuid selects one organization's overrides.
  const [orgId, setOrgId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [overriddenOnly, setOverriddenOnly] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  // Table (dense=true) vs card view, persisted so the choice survives
  // switching pages or closing the tab.
  const [dense, setDense] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DENSE_KEY) === "table";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DENSE_KEY, dense ? "table" : "card");
    } catch {
      /* storage unavailable — persistence is best-effort */
    }
  }, [dense]);
  const [activeSection, setActiveSection] = useState<string>("");

  const orgs = useOrganizations({ limit: 200 });
  const settings = useRuntimeSettings(orgId || undefined);

  // One draft for the whole page, so the table view and the card view stage
  // into the same set of pending changes and the apply dialog sees all of them.
  const draft = useSettingsDraft(orgId || undefined);

  // Switching scope abandons the draft. Pending edits are scope-bound — a
  // value staged against the global default is not the same change when
  // re-pointed at one tenant — and silently carrying them across would apply
  // them somewhere the operator never chose.
  useEffect(() => {
    // `draft.discardAll` is stable (useCallback with no deps), so listing it
    // keeps the dependency array honest without re-running on every render.
    draft.discardAll();
  }, [orgId, draft.discardAll]);

  const isOverriddenAtScope = (s: RuntimeSetting) =>
    orgId ? s.org_value !== null : s.global_value !== null;

  // Filter (search + overridden-only) then group in registry order.
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, RuntimeSetting[]>();
    for (const s of settings.data ?? []) {
      if (overriddenOnly && !isOverriddenAtScope(s)) continue;
      if (!matchesSearchQuery(t, s, q)) continue;
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return map;
  }, [settings.data, search, overriddenOnly, orgId, t]);

  const visibleGroups = GROUP_ORDER.filter((g) => grouped.has(g));

  // Total override count at this scope (across everything, ignoring filters).
  const overrideCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of settings.data ?? []) {
      if (isOverriddenAtScope(s)) counts[s.group] = (counts[s.group] ?? 0) + 1;
    }
    return counts;
  }, [settings.data, orgId]);
  const totalOverrides = Object.values(overrideCounts).reduce(
    (a, b) => a + b,
    0,
  );

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dense) return;
    const onScroll = () => {
      let current = "";
      for (const g of visibleGroups) {
        const el = document.getElementById(`section-${g}`);
        if (el && el.getBoundingClientRect().top <= SPY_TOLERANCE) current = g;
      }
      // A short final section can never scroll its top past the activation
      // line — the page bottom stops first — so it would never highlight.
      // When we're within a hair of the bottom, force the last section active
      // regardless of its top.
      const doc = document.documentElement;
      const atBottom =
        window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      if (atBottom && visibleGroups.length > 0) {
        current = visibleGroups[visibleGroups.length - 1];
      }
      setActiveSection(current || visibleGroups[0] || "");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [dense, visibleGroups]);

  const scrollToSection = (g: string) => {
    const el = document.getElementById(`section-${g}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  return {
    t,
    orgId,
    setOrgId,
    search,
    setSearch,
    overriddenOnly,
    setOverriddenOnly,
    showKeys,
    setShowKeys,
    dense,
    setDense,
    activeSection,
    orgs,
    settings,
    draft,
    grouped,
    visibleGroups,
    overrideCounts,
    totalOverrides,
    contentRef,
    scrollToSection,
  };
}

export type AdminSettingsPageController = ReturnType<
  typeof useAdminSettingsPage
>;
