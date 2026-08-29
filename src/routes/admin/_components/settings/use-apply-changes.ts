import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useApplyRuntimeSetting,
  useClearRuntimeSetting,
} from "@/lib/api/hooks/admin-settings";

import { CLEAR, type SettingsDraft } from "./use-settings-draft";

/**
 * Applies every pending change, one call each, with the shared reason.
 *
 * Each change is dropped from the draft the moment it lands. That matters on
 * partial failure: if the third of five fails, the two that succeeded are gone
 * from the draft and the dialog reopens showing only what is genuinely still
 * pending. Retrying then cannot re-apply — and re-audit — work that already
 * went through.
 */
export function useApplyChanges(draft: SettingsDraft, orgId?: string) {
  const { t } = useTranslation();
  const apply = useApplyRuntimeSetting(orgId);
  const clear = useClearRuntimeSetting(orgId);
  const [applying, setApplying] = useState(false);

  async function applyAll(reason: string, onDone: () => void) {
    setApplying(true);
    let applied = 0;
    try {
      for (const change of draft.changes) {
        if (change.value === CLEAR) {
          await clear.mutateAsync({ key: change.key, reason });
        } else {
          await apply.mutateAsync({
            key: change.key,
            value: change.value,
            reason,
          });
        }
        draft.discard(change.key);
        applied += 1;
      }
      toast.success(t("admin_settings.apply.applied", { count: applied }));
      onDone();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : t("admin_settings.apply.failed"),
      );
    } finally {
      setApplying(false);
    }
  }

  return { applying, applyAll };
}
