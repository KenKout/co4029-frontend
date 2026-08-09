import { Mail } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import type { MembershipRead } from "@/lib/api/types/admin-organizations";
import type { User } from "@/lib/api/types";

import { MembershipRowActions } from "./MembershipRowActions";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "./helpers";
import { useMembershipRow } from "./use-membership-row";
import type { MembershipsTabController } from "./use-memberships-tab";

/** Display name for a membership row, falling back to the raw user id. */
function memberDisplayName(m: MembershipRead, u: User | undefined): string {
  return u?.profile?.display_name?.trim() || m.user_id;
}

/** Actions cell: inline status edit + delete, reusing the row controller. */
function MembershipActionsCell({
  m,
  orgId,
}: {
  m: MembershipRead;
  orgId: string;
}) {
  const controller = useMembershipRow(m, orgId);
  return (
    <>
      <MembershipRowActions controller={controller} status={m.status} />
      {controller.confirmDialog}
    </>
  );
}

/**
 * Membership roster as a DataTable: user (avatar + name + email), codes,
 * joined date, status, actions. The user catalog comes from the tab
 * controller (one `/users/search?organization=` round-trip) so each row
 * shows the real avatar and display name instead of a bare user id.
 */
export function MembershipList({ c }: { c: MembershipsTabController }) {
  const { t, i18n, filteredMembers, userById } = c;

  const columns: DataTableColumn<MembershipRead>[] = [
    {
      id: "user",
      header: t("admin.organizations.memberships.cols.user", {
        defaultValue: "User",
      }),
      cell: (m) => {
        const u = userById.get(m.user_id);
        const displayName = memberDisplayName(m, u);
        return (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar size="sm" className={avatarColor(m.user_id)}>
              {u?.profile?.avatar_url && (
                <AvatarImage src={u.profile.avatar_url} alt={displayName} />
              )}
              <AvatarFallback>
                {avatarInitials(displayName, { uppercase: true })}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-strong truncate">
                {displayName}
              </p>
              <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {u?.primary_email ?? m.user_id}
                </span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "codes",
      header: t("admin.organizations.memberships.cols.codes", {
        defaultValue: "Codes",
      }),
      cell: (m) => (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
          {m.student_code && (
            <span>
              {t("admin.organizations.fields.student_code")}:{" "}
              <span className="font-mono text-text-strong">
                {m.student_code}
              </span>
            </span>
          )}
          {m.employee_code && (
            <span>
              {t("admin.organizations.fields.employee_code")}:{" "}
              <span className="font-mono text-text-strong">
                {m.employee_code}
              </span>
            </span>
          )}
          {!m.student_code && !m.employee_code && (
            <span className="italic">—</span>
          )}
        </div>
      ),
    },
    {
      id: "joined_at",
      header: t("admin.organizations.fields.joined_at"),
      cell: (m) => (
        <span className="text-xs text-text-muted">
          {formatDate(m.joined_at, i18n.language)}
        </span>
      ),
    },
    {
      id: "status",
      header: t("admin.organizations.memberships.cols.status", {
        defaultValue: "Status",
      }),
      cell: (m) => <StatusBadge status={m.status} type="membership" />,
    },
    {
      id: "actions",
      header: t("admin.organizations.memberships.cols.actions", {
        defaultValue: "Actions",
      }),
      align: "right",
      cell: (m) => <MembershipActionsCell m={m} orgId={c.orgId} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filteredMembers}
      getRowId={(m) => m.id}
      pagination
      pageSize={10}
      emptyState={
        c.search
          ? t("admin.organizations.memberships.empty_search", {
              defaultValue: "No matching members",
            })
          : t("admin.organizations.empty.memberships")
      }
      toolbar={
        <DataTableToolbar
          search={c.search}
          onSearchChange={c.setSearch}
          searchPlaceholder={t(
            "admin.organizations.memberships.search_placeholder",
            { defaultValue: "Search by name or email…" },
          )}
        />
      }
    />
  );
}
