import { useTranslation } from "react-i18next";

import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";

import { useSettingsDraft, type SettingsDraft } from "./use-settings-draft";

/**
 * Stateful half of the dense settings table.
 *
 * It used to own the set / clear mutations and fire them on change. It now
 * owns a draft instead: the controls stage edits, and nothing reaches the
 * server until the operator applies them with a reason (PRD ADM-030).
 */
export function useSettingsTable(orgId?: string, sharedDraft?: SettingsDraft) {
  const { t } = useTranslation();
  // A page that renders both the table and the card list passes one draft in
  // so the two views stage into the same set of pending changes.
  const ownDraft = useSettingsDraft(orgId);
  const draft = sharedDraft ?? ownDraft;

  const scopeLabel = orgId ? "This org" : "Global";

  const overrideAtScope = (s: RuntimeSetting) =>
    orgId !== undefined ? s.org_value !== null : s.global_value !== null;

  return { t, draft, scopeLabel, overrideAtScope };
}

export type SettingsTableController = ReturnType<typeof useSettingsTable>;
