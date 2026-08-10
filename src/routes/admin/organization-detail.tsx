import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { Tabs } from "@/components/ui/tabs";
import { useOrganization } from "@/lib/api/hooks/admin-organizations";
import { usePermissions } from "@/lib/auth/use-permissions";
import { DomainsTab } from "./_components/organization-detail/DomainsTab";
import { InfoTab } from "./_components/organization-detail/InfoTab";
import { MembershipsTab } from "./_components/organization-detail/MembershipsTab";
import { OrganizationDetailHeader } from "./_components/organization-detail/OrganizationDetailHeader";
import { UnitsTab } from "./_components/organization-detail/UnitsTab";
import { TAB_KEYS } from "./_components/organization-detail/constants";
import type { TabKey } from "./_components/organization-detail/types";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminOrganizationDetailPage() {
  const { t } = useTranslation();
  const { orgId } = useParams({ strict: false });
  const [tab, setTab] = useState<TabKey>("info");
  const permissions = usePermissions();
  const { data: org, isLoading } = useOrganization(orgId);

  const canManage = permissions.hasAny(
    "system.administer",
    "org_unit.manage",
    "user.bulk_import",
  );

  if (!orgId) return null;
  if (permissions.isLoading || isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-12 w-72 rounded-md" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (!canManage) return <PermissionDenied />;

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("nav.admin"), to: "/admin/stats" },
          {
            label: t("admin.organizations.title"),
            to: "/admin/organizations",
          },
          { label: org?.name ?? "..." },
        ]}
      />

      <OrganizationDetailHeader org={org} />

      <Tabs
        ariaLabel={t("admin.organizations.tabs.aria_label", {
          defaultValue: "Organization sections",
        })}
        tabs={TAB_KEYS.map((key) => ({
          key,
          label: t(`admin.organizations.tabs.${key}`),
        }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "info" && <InfoTab orgId={orgId} />}
      {tab === "domains" && <DomainsTab orgId={orgId} />}
      {tab === "units" && <UnitsTab orgId={orgId} />}
      {tab === "memberships" && <MembershipsTab orgId={orgId} />}
    </div>
  );
}

