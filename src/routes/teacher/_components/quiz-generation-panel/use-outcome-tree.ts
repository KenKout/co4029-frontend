import { useMemo } from "react";

import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";

/**
 * Course learning-outcome tree for the target-outcome picker.
 *
 * Keeps the parent → children index and the depth-first descendant walk beside
 * the query that feeds them, so a parent toggle can cascade to its whole
 * subtree without the panel re-deriving the map.
 */
export function useOutcomeTree(courseId: string | undefined) {
  const { data: outcomes = [] } = useTeacherCourseOutcomes(courseId);
  // Map each outcome id -> its direct child ids, so a parent toggle can
  // cascade to the whole subtree. Built once per outcomes change.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const o of outcomes) {
      if (!o.parent_id) continue;
      const siblings = map.get(o.parent_id) ?? [];
      siblings.push(o.id);
      map.set(o.parent_id, siblings);
    }
    return map;
  }, [outcomes]);

  // The outcome id plus every descendant id (depth-first). Used by
  // toggleOutcome / select-all so parent selection implies its children.
  function outcomeWithDescendants(outcomeId: string): string[] {
    const acc: string[] = [];
    const walk = (id: string) => {
      acc.push(id);
      for (const childId of childrenByParent.get(id) ?? []) walk(childId);
    };
    walk(outcomeId);
    return acc;
  }

  return { outcomes, childrenByParent, outcomeWithDescendants };
}
