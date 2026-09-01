import { OrgUnitTable } from "@/components/ui/org-unit-table";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";

/**
 * Org-unit hierarchy on the admin organization-detail page.
 *
 * Renders the SAME `OrgUnitTable` as the manager screen so both surfaces
 * agree on what the organization looks like and a fix lands for both at
 * once — the same reasoning `LessonKnowledgeMap` uses for sharing the
 * knowledge-graph viewer between teacher and student.
 *
 * The course/people count columns are omitted here: this page is org
 * administration, and loading a manager-scoped course list to populate them
 * would be a cross-surface fetch for a column nobody on this screen acts on.
 */
export function UnitList({ nodes }: { nodes: OrgUnitNode[] }) {
  return <OrgUnitTable nodes={nodes} />;
}
