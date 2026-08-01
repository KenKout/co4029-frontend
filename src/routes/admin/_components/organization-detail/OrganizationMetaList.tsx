import { useTranslation } from "react-i18next";
import type { OrganizationRead } from "@/lib/api/types/admin-organizations";
import { formatDate } from "./helpers";

/**
 * Read-only slug / id / timestamps grid at the top of the info tab.
 */
export function OrganizationMetaList({
  org,
  language,
}: {
  org: OrganizationRead;
  language: string;
}) {
  const { t } = useTranslation();
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <dt className="text-xs text-text-muted">
          {t("admin.organizations.fields.slug")}
        </dt>
        <dd className="font-mono text-sm mt-0.5">{org.slug}</dd>
      </div>
      <div>
        <dt className="text-xs text-text-muted">
          {t("admin.organizations.fields.id")}
        </dt>
        <dd className="font-mono text-xs mt-0.5 break-all">{org.id}</dd>
      </div>
      <div>
        <dt className="text-xs text-text-muted">
          {t("admin.organizations.fields.created_at")}
        </dt>
        <dd className="text-sm mt-0.5">
          {formatDate(org.created_at, language)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-text-muted">
          {t("admin.organizations.fields.updated_at")}
        </dt>
        <dd className="text-sm mt-0.5">
          {formatDate(org.updated_at, language)}
        </dd>
      </div>
    </dl>
  );
}
