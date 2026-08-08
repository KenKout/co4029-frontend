import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useEditForm, type EditFormInitialValues } from "./use-edit-form";

/**
 * Inline metadata editor (name, organization, description) for the career path.
 * Purely presentational — every piece of state lives in `useEditForm`.
 *
 * The organization is fixed at creation (server-derived from the actor's
 * primary org), so it renders as a locked Select showing the owning org.
 * There is deliberately no org-unit selector: the path's org is locked and
 * ``org_unit_id`` is not consumed by any backend read path — offering an
 * editable unit picker under a locked org was misleading.
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
            {t("management_career_path_detail.fields.organization")}
          </label>
          <Select
            value={form.organizationId}
            onValueChange={() => {
              // The path's org is fixed at creation — the select is a locked
              // read-only display, not a control.
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
