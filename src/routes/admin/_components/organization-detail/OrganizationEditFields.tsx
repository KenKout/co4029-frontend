import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { OrganizationStatus } from "@/lib/api/types/admin-organizations";
import { ORGANIZATION_STATUS_VALUES } from "./constants";
import type { InfoTabController } from "./use-info-tab";

/**
 * Editable name + status half of the info tab. The draft setters and the patch
 * mutation come straight off the tab controller; `name`, `orgStatus`, `dirty`
 * and `onSave` are the values the tab derives once `org` is known.
 */
export function OrganizationEditFields({
  controller,
  name,
  orgStatus,
  dirty,
  onSave,
}: {
  controller: InfoTabController;
  name: string;
  orgStatus: OrganizationStatus;
  dirty: boolean;
  onSave: () => void;
}) {
  const { t, patch, setDraftName, setDraftStatus } = controller;
  return (
    <div className="border-t border-m3-outline-variant/40 pt-5 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.name")}
        </span>
        <Input
          type="text"
          value={name}
          onChange={(e) => setDraftName(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.status")}
        </span>
        <Select<OrganizationStatus>
          value={orgStatus}
          onValueChange={(next) => setDraftStatus(next)}
          options={ORGANIZATION_STATUS_VALUES.map((k) => ({
            value: k,
            label: t(`admin.organizations.status_label.${k}`),
          }))}
          className="mt-1"
        />
      </label>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={!dirty || patch.isPending}
        >
          {patch.isPending
            ? t("admin.organizations.actions.saving")
            : t("admin.organizations.actions.save")}
        </Button>
      </div>
    </div>
  );
}
