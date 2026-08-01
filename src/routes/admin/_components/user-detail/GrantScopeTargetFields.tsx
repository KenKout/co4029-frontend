import { Select } from "@/components/ui/select";

import type { RoleAssignmentsController } from "./types";

/** The scope-dependent target pickers of the assign-new-role form. */
export function GrantScopeTargetFields({
  c,
}: {
  c: RoleAssignmentsController;
}) {
  const {
    t,
    scopeKind,
    organizationId,
    setOrganizationId,
    orgUnitId,
    setOrgUnitId,
    courseId,
    setCourseId,
    orgOptions,
    orgUnitOptions,
  } = c;

  return (
    <>
      {scopeKind === "organization" || scopeKind === "org_unit" ? (
        <label className="text-xs text-text-muted">
          {t("admin.users.roles.organization")}
          <Select
            value={organizationId}
            onValueChange={(next) => setOrganizationId(next)}
            options={[
              {
                value: "",
                label: t("admin.users.roles.select_organization", {
                  defaultValue: "— Select organization —",
                }),
              },
              ...orgOptions.map((o) => ({ value: o.id, label: o.name })),
            ]}
            className="mt-1"
          />
        </label>
      ) : null}
      {scopeKind === "org_unit" ? (
        <label className="text-xs text-text-muted">
          {t("admin.users.roles.org_unit")}
          <Select
            value={orgUnitId}
            onValueChange={(next) => setOrgUnitId(next)}
            disabled={!organizationId}
            options={[
              {
                value: "",
                label: !organizationId
                  ? t("admin.users.roles.select_org_first", {
                      defaultValue: "— Select an organization first —",
                    })
                  : t("admin.users.roles.select_org_unit", {
                      defaultValue: "— Select org unit —",
                    }),
              },
              ...orgUnitOptions.map((u) => ({
                value: u.id,
                label: u.name,
              })),
            ]}
            className="mt-1"
          />
        </label>
      ) : null}
      {scopeKind === "course" ? (
        <label className="text-xs text-text-muted">
          {t("admin.users.roles.course_id")}
          <input
            type="text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-surface-elev px-2 py-1.5 text-sm font-mono"
            required
          />
        </label>
      ) : null}
    </>
  );
}
