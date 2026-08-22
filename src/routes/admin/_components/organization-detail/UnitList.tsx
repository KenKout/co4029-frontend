import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { OrgUnitTree } from "@/components/ui/org-unit-tree";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";

/**
 * Org-unit hierarchy for the admin organization detail page.
 *
 * Was a flat roster, which could not show the parent/child structure the
 * data model has always had — every unit looked top-level regardless of its
 * `parent_unit_id`. Now renders the same `OrgUnitTree` as the manager
 * screen so both surfaces agree on what the organization looks like.
 *
 * Rendered only once the query has settled and the list is non-empty — the
 * loading and empty branches stay in `UnitsTab`.
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
    <div className="rounded-xl border border-m3-outline-variant/40 bg-white p-3">
      <OrgUnitTree
        nodes={nodes}
        renderActions={(node) => (
          <Button
            variant="ghost"
            type="button"
            onClick={() => onRemove(node.id)}
            className="h-auto whitespace-normal rounded-md p-1.5 text-red-600 hover:bg-red-50"
            aria-label={t("admin.organizations.actions.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      />
    </div>
  );
}
