import { useTranslation } from "react-i18next";
import { useOrgUnits, useOrgUnitTree } from "@/lib/api/hooks/admin-organizations";

/**
 * Admin receives a read-only Faculty inventory. Academic structure is owned
 * by the Master Dean from the management surface.
 */
export function useUnitsTab(orgId: string) {
  const { t } = useTranslation();
  const { data: units, isLoading } = useOrgUnits(orgId);
  // The flat list drives the empty state; the tree-compatible response drives
  // the shared table component.
  const tree = useOrgUnitTree(orgId);

  return {
    t,
    units,
    isLoading,
    treeNodes: tree.data ?? [],
  };
}

export type UnitsTabController = ReturnType<typeof useUnitsTab>;
