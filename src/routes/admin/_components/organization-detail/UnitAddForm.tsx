import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/tooltip";
import type { UnitType } from "@/lib/api/types/admin-organizations";
import { flattenOrgUnits } from "@/lib/org-unit-tree-helpers";
import { UNIT_TYPE_VALUES } from "./constants";
import type { UnitsTabController } from "./use-units-tab";

const ROOT = "__root__";

/**
 * Inline "add an org unit" form at the top of the units tab.
 *
 * The parent selector is what makes the hierarchy reachable from the admin
 * UI: the create call used to pass `parent_unit_id: null` unconditionally,
 * so every unit was created at the top level no matter what the org
 * actually looked like.
 */
export function UnitAddForm({
  controller,
}: {
  controller: UnitsTabController;
}) {
  const {
    t,
    create,
    name,
    setName,
    code,
    setCode,
    unitType,
    setUnitType,
    parentUnitId,
    setParentUnitId,
    treeNodes,
    handleAdd,
  } = controller;

  // Indented labels stand in for the tree shape inside a flat <Select>.
  const parentOptions = [
    { value: ROOT, label: t("admin.organizations.fields.no_parent") },
    ...flattenOrgUnits(treeNodes).map((u) => ({
      value: u.id,
      label: `${"  ".repeat(u.depth)}${u.name}`,
    })),
  ];
  return (
    <form
      onSubmit={handleAdd}
      className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 grid grid-cols-1 md:grid-cols-12 gap-3"
    >
      <label className="md:col-span-2">
        <span className="text-sm font-semibold text-text-strong inline-flex items-center gap-1">
          {t("admin.organizations.fields.unit_type")}
          <InfoTooltip
            content={t("admin.organizations.tooltips.unit_type")}
            label={t("admin.organizations.fields.unit_type")}
            // The Type field sits flush against the left edge of the content
            // area (first grid column next to the fixed sidebar). Opening
            // upward centers the popup over the sidebar boundary; opening to
            // the right keeps it fully inside the content column.
            side="right"
          />
        </span>
        <Select<UnitType>
          value={unitType}
          onValueChange={(next) => setUnitType(next)}
          options={UNIT_TYPE_VALUES.map((k) => ({
            value: k,
            label: t(`admin.organizations.unit_type_label.${k}`),
          }))}
          className="mt-1"
        />
      </label>
      <label className="md:col-span-3">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.name")}{" "}
          <span className="text-red-500">*</span>
        </span>
        <Input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
        />
      </label>
      <label className="md:col-span-3">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.parent")}
        </span>
        <Select<string>
          value={parentUnitId ?? ROOT}
          onValueChange={(next) => setParentUnitId(next === ROOT ? null : next)}
          options={parentOptions}
          className="mt-1"
        />
      </label>
      <label className="md:col-span-2">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.code")}
        </span>
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CNTT"
          className="mt-1 font-mono"
        />
      </label>
      <div className="md:col-span-2 flex items-end">
        <Button
          type="submit"
          disabled={create.isPending}
          className="gap-1 w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          {create.isPending
            ? t("admin.organizations.actions.adding")
            : t("admin.organizations.actions.add")}
        </Button>
      </div>
    </form>
  );
}
