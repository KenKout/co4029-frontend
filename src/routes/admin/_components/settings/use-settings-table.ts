import { useTranslation } from "react-i18next";
import {
  useClearRuntimeSetting,
  useSetRuntimeSetting,
  type RuntimeSetting,
} from "@/lib/api/hooks/admin-settings";

/**
 * Stateful half of the dense settings table: the set / clear mutations for the
 * active scope plus the two scope-derived helpers the columns need.
 *
 * Hook order matches the original inline `SettingsTable` exactly —
 * useTranslation, useSetRuntimeSetting, useClearRuntimeSetting.
 */
export function useSettingsTable(orgId?: string) {
  const { t } = useTranslation();
  const setMutation = useSetRuntimeSetting(orgId);
  const clearMutation = useClearRuntimeSetting(orgId);

  const scopeLabel = orgId ? "This org" : "Global";

  const overrideAtScope = (s: RuntimeSetting) =>
    orgId !== undefined ? s.org_value !== null : s.global_value !== null;

  return { t, setMutation, clearMutation, scopeLabel, overrideAtScope };
}

export type SettingsTableController = ReturnType<typeof useSettingsTable>;
