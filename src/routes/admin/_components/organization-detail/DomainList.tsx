import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrganizationDomainRead } from "@/lib/api/types/admin-organizations";
import { Button } from "@/components/ui/button";

/**
 * Verified-domain roster. Rendered only once the query has settled and the
 * list is non-empty — the loading and empty branches stay in `DomainsTab` so
 * the tab's conditional-render shape is unchanged.
 */
export function DomainList({
  domains,
  onRemove,
}: {
  domains: OrganizationDomainRead[];
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className="rounded-xl bg-white border border-m3-outline-variant/40 divide-y divide-m3-outline-variant/40">
      {domains.map((d) => (
        <li
          key={d.id}
          className="px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="font-mono text-sm text-text-strong">{d.domain}</p>
            {d.auto_provision && (
              <p className="text-xs text-emerald-700 mt-0.5">
                {t("admin.organizations.fields.auto_provision")}
              </p>
            )}
          </div>
          <Button variant="ghost"
            type="button"
            onClick={() => onRemove(d.id)}
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
