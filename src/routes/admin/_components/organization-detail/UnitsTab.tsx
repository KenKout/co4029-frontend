import { Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { UnitAddForm } from "./UnitAddForm";
import { UnitList } from "./UnitList";
import { useUnitsTab } from "./use-units-tab";

export function UnitsTab({ orgId }: { orgId: string }) {
  const controller = useUnitsTab(orgId);
  const { t, units, isLoading, confirmDialog, handleRemove } = controller;

  return (
    <div className="space-y-4">
      <UnitAddForm controller={controller} />

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (units ?? []).length === 0 ? (
        <EmptyState
          icon={Layers}
          message={t("admin.organizations.empty.units")}
        />
      ) : (
        <UnitList units={units ?? []} onRemove={handleRemove} />
      )}
      {confirmDialog}
    </div>
  );
}
