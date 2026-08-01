import { Building2, Mail, Users } from "lucide-react";

import type { DataTableColumn } from "@/components/ui/data-table";
import { UserStatusBadge as StatusBadge } from "@/components/ui/status-badges";

import { RoleBadges } from "./RoleBadges";
import type { TFn, UserWithRoles } from "./types";

export function buildUserColumns(
  t: TFn,
  labelFor: (code: string) => string,
  formatDate: (iso: string | null | undefined) => string,
): DataTableColumn<UserWithRoles>[] {
  return [
    {
      // id must match the backend sort whitelist key.
      id: "email",
      header: t("admin.users.cols.user", { defaultValue: "User" }),
      sortable: true,
      cell: (u) => {
        const displayName = u.profile?.display_name?.trim() || u.primary_email;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-m3-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-strong truncate">
                {displayName}
              </p>
              <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{u.primary_email}</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      // Not sortable: roles are a cross-table aggregate, not a User column.
      id: "roles",
      header: t("admin.users.cols.role", { defaultValue: "Role" }),
      cell: (u) => <RoleBadges roles={u.roles ?? []} labelFor={labelFor} />,
    },
    {
      // Not sortable: primary org is a cross-table aggregate (membership).
      id: "organization",
      header: t("admin.users.cols.organization", {
        defaultValue: "Organization",
      }),
      cell: (u) =>
        u.organization_name ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-text-strong">
            <Building2 className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <span className="truncate">{u.organization_name}</span>
          </span>
        ) : (
          <span className="text-xs text-text-muted italic">
            {t("admin.users.no_organization", { defaultValue: "—" })}
          </span>
        ),
    },
    {
      id: "status",
      header: t("admin.users.cols.status", { defaultValue: "Status" }),
      sortable: true,
      cell: (u) => <StatusBadge status={u.status} />,
    },
    {
      id: "created_at",
      header: t("admin.users.cols.joined", { defaultValue: "Joined" }),
      sortable: true,
      align: "right",
      cell: (u) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(u.created_at)}
        </span>
      ),
    },
  ];
}
