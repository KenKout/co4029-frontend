import { Link } from "@tanstack/react-router";
import { ArrowLeft, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrganizationRead } from "@/lib/api/types/admin-organizations";
import { StatusBadge } from "./StatusBadge";

/**
 * Identity header: the org avatar, name, slug + status pill, and the back link
 * to the organizations list. `org` is undefined while the query is in flight,
 * which is why the name falls back to the ellipsis placeholder.
 */
export function OrganizationDetailHeader({
  org,
}: {
  org: OrganizationRead | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <Building2 className="h-6 w-6 text-m3-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-headline font-bold text-text-strong truncate">
            {org?.name ?? "..."}
          </h1>
          {org && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm font-mono text-text-muted">
                {org.slug}
              </span>
              <StatusBadge status={org.status} />
            </div>
          )}
        </div>
      </div>
      <Link
        to="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.organizations.back_to_list")}
      </Link>
    </div>
  );
}
