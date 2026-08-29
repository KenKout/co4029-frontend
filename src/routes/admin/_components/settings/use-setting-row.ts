import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";

import { settingLabel } from "./helpers";
import { CLEAR, type SettingsDraft } from "./use-settings-draft";

/**
 * Stateful half of a card-view setting row: the details toggle plus the draft
 * staging helpers for the active scope.
 *
 * It used to hold set / clear mutations and fire them from the control's
 * onChange. Nothing here writes any more (PRD ADM-030) — edits are staged and
 * applied together, with a reason, from the apply dialog.
 */
export function useSettingRow(
  setting: RuntimeSetting,
  draft: SettingsDraft,
  orgId?: string,
) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const label = settingLabel(t, setting);

  const overrideAtThisScope =
    orgId !== undefined
      ? setting.org_value !== null
      : setting.global_value !== null;

  const stage = (value: boolean | number) => draft.stage(setting, value);
  const stageClear = () => draft.stage(setting, CLEAR);

  const commitNumber = (raw: string) => {
    const parsed = Number(raw);
    // Refuse rather than coerce: an empty field is not a request to set zero.
    if (raw.trim() === "" || Number.isNaN(parsed)) return;
    draft.stage(setting, parsed);
  };

  return {
    t,
    expanded,
    setExpanded,
    draft,
    label,
    overrideAtThisScope,
    isPending: draft.isPending(setting.key),
    value: draft.displayValue(setting),
    stage,
    stageClear,
    commitNumber,
  };
}

export type SettingRowController = ReturnType<typeof useSettingRow>;
