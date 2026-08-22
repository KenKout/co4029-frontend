import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
export function UnitList({
  nodes,
  onRemove,
}: {
  nodes: OrgUnitNode[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <OrgUnitTable
      nodes={nodes}
      actions={(node) => (
        <Button
          variant="ghost"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(node.id);
          }}
          className="h-auto whitespace-normal rounded-md p-2 text-red-600 hover:bg-red-50"
          aria-label={t("admin.organizations.actions.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    />
  );
}
