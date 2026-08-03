import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useEditForm, type EditFormInitialValues } from "./use-edit-form";

/**
 * Inline metadata editor (name, org unit, description) for the career path.
 * Purely presentational — every piece of state lives in `useEditForm`.
 *
 * The org-unit field is a cascading org → org-unit selector (same pattern as
 * the admin user page) instead of a raw UUID text box: the path's organization
 * is fixed at creation, so it pins the org select to that org and offers only
 * its units.
 */
export function EditForm(props: EditFormInitialValues) {
  const { t } = useTranslation();
  const form = useEditForm(props, t);

  return (
    <form
      onSubmit={form.handleSubmit}
      className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_path_detail.fields.name")}
          </label>
          <Input
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_path_detail.fields.org_unit")}
          </label>
          <Select
            value={form.organizationId}
            onValueChange={() => {
              // The path's org is fixed at creation — never re-scope the unit
              // picker to a different org (the backend doesn't re-validate
              // org_unit membership on PATCH, so a cross-org unit would stick).
            }}
            disabled
            options={
              form.orgOptions.length > 0
                ? form.orgOptions.map((o) => ({
                    value: o.id,
                    label: o.name,
                  }))
                : [
                    {
                      value: "",
                      label: t(
                        "management_career_path_detail.placeholders.organization_fixed",
                      ),
                    },
                  ]
            }
          />
          <Select
            value={form.orgUnitId}
            onValueChange={(next) => form.setOrgUnitId(next)}
            disabled={!form.organizationId}
            options={[
              {
                value: "",
                label: !form.organizationId
                  ? t(
                      "management_career_path_detail.placeholders.select_org_first",
                    )
                  : t(
                      "management_career_path_detail.placeholders.select_org_unit",
                    ),
              },
              ...form.orgUnitOptions.map((u) => ({
                value: u.id,
                label: u.name,
              })),
            ]}
          />
          {form.orgUnitsLoading && (
            <p className="flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant italic">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("management_career_path_detail.placeholders.loading_units")}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("management_career_path_detail.fields.description")}
        </label>
        <textarea
          value={form.description}
          onChange={(e) => form.setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!form.dirty || form.patch.isPending}
          className="gap-2"
        >
          {form.patch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
