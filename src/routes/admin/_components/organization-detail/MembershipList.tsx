import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import type { MembershipRead } from "@/lib/api/types/admin-organizations";
import type { User } from "@/lib/api/types";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/user-identity";

import { MembershipRowActions } from "./MembershipRowActions";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "./helpers";
import { useMembershipRow } from "./use-membership-row";
import type { MembershipsTabController } from "./use-memberships-tab";

/** Display name for a membership row, falling back to the raw user id. */
function memberDisplayName(m: MembershipRead, u: User | undefined): string {
  return getUserDisplayName(u, m.user_id);
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
      <MembershipRowActions controller={controller} />
      {controller.confirmDialog}
    </>
  );
}

/**
 * Membership roster as a DataTable: user (avatar + name + email), joined
 * date, status, actions. The user catalog comes from the tab
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
        return (
          <UserEmailIdentity
            id={m.user_id}
            displayName={memberDisplayName(m, u)}
            avatarUrl={getUserAvatarUrl(u)}
            email={u?.primary_email ?? m.user_id}
          />
        );
      },
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
