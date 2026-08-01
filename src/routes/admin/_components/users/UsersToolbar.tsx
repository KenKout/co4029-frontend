import { SearchInput } from "@/components/ui/search-input";

import type { AdminUsersController } from "./use-admin-users";

/** Search box plus the role and organization filter dropdowns. */
export function UsersToolbar({ c }: { c: AdminUsersController }) {
  const { t, table, roleOptions, orgOptions } = c;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        wrapperClassName="max-w-md flex-1 min-w-[220px]"
        value={table.search}
        onChange={(e) => table.setSearch(e.target.value)}
        placeholder={t("admin.users.search_placeholder", {
          defaultValue: "Search by name or email…",
        })}
        className="pl-10"
      />
      <select
        value={table.roleFilter ?? ""}
        onChange={(e) => table.setRoleFilter(e.target.value || undefined)}
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-primary cursor-pointer"
        aria-label={t("admin.users.filter_role", {
          defaultValue: "Filter by role",
        })}
      >
        <option value="">
          {t("admin.users.all_roles", { defaultValue: "All roles" })}
        </option>
        {roleOptions.map((r) => (
          <option key={r.id} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        value={table.orgFilter ?? ""}
        onChange={(e) => table.setOrgFilter(e.target.value || undefined)}
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-strong outline-none focus:border-primary cursor-pointer max-w-[220px]"
        aria-label={t("admin.users.filter_organization", {
          defaultValue: "Filter by organization",
        })}
      >
        <option value="">
          {t("admin.users.all_organizations", {
            defaultValue: "All organizations",
          })}
        </option>
        {orgOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
