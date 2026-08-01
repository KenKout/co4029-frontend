import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useClearRuntimeSetting,
  useSetRuntimeSetting,
  type RuntimeSetting,
} from "@/lib/api/hooks/admin-settings";
import { settingLabel } from "./helpers";

/**
 * Stateful half of a card-view setting row: the details toggle plus the set /
 * clear mutations for the active scope.
 *
 * Hook order matches the original inline `SettingRow` exactly —
 * useTranslation, the `expanded` state, useSetRuntimeSetting,
 * useClearRuntimeSetting — and `t` is returned from here rather than resolved
 * again in the component so the row still makes a single `useTranslation`
 * call in the same position.
 */
export function useSettingRow(setting: RuntimeSetting, orgId?: string) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const setMutation = useSetRuntimeSetting(orgId);
  const clearMutation = useClearRuntimeSetting(orgId);
  const label = settingLabel(t, setting);

  const overrideAtThisScope =
    orgId !== undefined
      ? setting.org_value !== null
      : setting.global_value !== null;

  const save = (value: boolean | number) => {
    setMutation.mutate(
      { key: setting.key, value },
      {
        onSuccess: () => toast.success(`${label} saved`),
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Could not save"),
      },
    );
  };

  const commitNumber = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed)) {
      toast.error(`${label} must be a number`);
      return;
    }
    save(parsed);
  };

  return {
    t,
    expanded,
    setExpanded,
    setMutation,
    clearMutation,
    label,
    overrideAtThisScope,
    save,
    commitNumber,
  };
}

export type SettingRowController = ReturnType<typeof useSettingRow>;
