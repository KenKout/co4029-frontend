import { Plus } from "lucide-react";

import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { GrantScopeTargetFields } from "./GrantScopeTargetFields";
import type { RoleAssignmentsController } from "./types";

export function GrantRoleForm({ c }: { c: RoleAssignmentsController }) {
  const {
    t,
    roleCode,
    setRoleCode,
    scopeKind,
    setScopeKind,
    roleOptions,
    isGrantValid,
    grantIsPending,
    handleGrant,
  } = c;

  return (
    <form
      onSubmit={handleGrant}
      className="mt-4 pt-4 border-t border-border space-y-3"
    >
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        {t("admin.users.roles.assign_new")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs text-text-muted">
          {t("admin.users.roles.role")}
          <Select
            value={roleCode}
            onValueChange={(next) => setRoleCode(next)}
            options={[
              { value: "", label: t("admin.users.roles.select_role") },
              ...roleOptions.map((r) => ({
                value: r.code,
                label: `${r.name} (${r.code})`,
              })),
            ]}
            className="mt-1"
          />
        </label>
        <label className="text-xs text-text-muted">
          {t("admin.users.roles.scope")}
          <Select
            value={scopeKind}
            onValueChange={(next) => setScopeKind(next)}
            options={[
              {
                value: "organization",
                label: t("admin.users.roles.scope_organization"),
              },
              {
                value: "org_unit",
                label: t("admin.users.roles.scope_org_unit"),
              },
              {
                value: "course",
                label: t("admin.users.roles.scope_course"),
              },
              {
                value: "global",
                label: t("admin.users.roles.scope_global"),
              },
            ]}
            className="mt-1"
          />
        </label>
        <GrantScopeTargetFields c={c} />
      </div>
      <Button variant="ghost"
        type="submit"
        disabled={grantIsPending || !isGrantValid}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:bg-m3-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="h-3.5 w-3.5" />
        {grantIsPending
          ? t("admin.users.roles.granting")
          : t("admin.users.roles.grant")}
      </Button>
    </form>
  );
}
