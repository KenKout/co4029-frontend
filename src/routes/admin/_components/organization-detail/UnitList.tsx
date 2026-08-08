import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrgUnitRead } from "@/lib/api/types/admin-organizations";
import { Button } from "@/components/ui/button";

/**
 * Org-unit roster. Rendered only once the query has settled and the list is
 * non-empty — the loading and empty branches stay in `UnitsTab`.
 */
export function UnitList({
  units,
  onRemove,
}: {
  units: OrgUnitRead[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className="rounded-xl bg-white border border-m3-outline-variant/40 divide-y divide-m3-outline-variant/40">
      {units.map((u) => (
        <li
          key={u.id}
          className="px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-strong">
              {u.name}
              {u.code && (
                <span className="ml-2 text-xs text-text-muted font-mono font-normal">
                  [{u.code}]
                </span>
              )}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {t(`admin.organizations.unit_type_label.${u.unit_type}`, {
                defaultValue: u.unit_type,
              })}
            </p>
          </div>
          <Button variant="ghost"
            type="button"
            onClick={() => onRemove(u.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md shrink-0"
            aria-label={t("admin.organizations.actions.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
