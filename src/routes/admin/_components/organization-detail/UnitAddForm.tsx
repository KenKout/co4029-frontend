import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { UnitType } from "@/lib/api/types/admin-organizations";
import { UNIT_TYPE_VALUES } from "./constants";
import type { UnitsTabController } from "./use-units-tab";

/**
 * Inline "add an org unit" form at the top of the units tab.
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
    handleAdd,
  } = controller;
  return (
    <form
      onSubmit={handleAdd}
      className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 grid grid-cols-1 md:grid-cols-12 gap-3"
    >
      <label className="md:col-span-3">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.unit_type")}
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
      <label className="md:col-span-5">
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
          className="w-full gap-1"
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
