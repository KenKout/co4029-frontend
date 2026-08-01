import { useMemo } from "react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type { ModuleGroup, TranslateFn } from "./types";

/**
 * Group filtered questions by source module for the bank display:
 *   - one group per module (questions attributed to exactly that module)
 *   - a dedicated "multiple modules" group for questions drawing from 2+
 *   - an "unattributed" group for legacy rows with no module ids
 * Groups render in course module order; multi-module + unattributed last.
 *
 * Extracted from the former 2.4k-line question-bank.tsx with the same memo
 * dependencies, so grouping recomputes at exactly the same times as before.
 */
export function useModuleGroups(options: {
  filtered: InterviewQuestionAuthoring[];
  modules: { id: string; title: string }[];
  t: TranslateFn;
}) {
  const { filtered, modules, t } = options;

  const moduleTitleById = useMemo(
    () => new Map(modules.map((m) => [m.id, m.title])),
    [modules],
  );

  const groupedByModule = useMemo(() => {
    const single = new Map<string, InterviewQuestionAuthoring[]>();
    const multi: InterviewQuestionAuthoring[] = [];
    const none: InterviewQuestionAuthoring[] = [];
    for (const q of filtered) {
      const ids = Array.isArray(q.source_module_ids) ? q.source_module_ids : [];
      if (ids.length === 0) none.push(q);
      else if (ids.length === 1) {
        const key = ids[0];
        const arr = single.get(key) ?? [];
        arr.push(q);
        single.set(key, arr);
      } else multi.push(q);
    }
    // Order single-module groups by the course module order when known.
    const orderedIds = [
      ...modules.map((m) => m.id).filter((id) => single.has(id)),
      ...[...single.keys()].filter((id) => !modules.some((m) => m.id === id)),
    ];
    const groups: ModuleGroup[] = orderedIds.map((id) => ({
      key: id,
      title:
        moduleTitleById.get(id) ??
        t("teacher_interview_config.qbank.module_unknown"),
      kind: "module",
      items: single.get(id) ?? [],
    }));
    if (multi.length > 0)
      groups.push({
        key: "__multi__",
        title: t("teacher_interview_config.qbank.module_multi"),
        kind: "multi",
        items: multi,
      });
    if (none.length > 0)
      groups.push({
        key: "__none__",
        title: t("teacher_interview_config.qbank.module_none"),
        kind: "none",
        items: none,
      });
    return groups;
  }, [filtered, modules, moduleTitleById, t]);

  // Only show group headers when there's genuinely more than one group to
  // distinguish — a single-group bank renders flat as before.
  const showModuleGroups = groupedByModule.length > 1;

  return { moduleTitleById, groupedByModule, showModuleGroups };
}
