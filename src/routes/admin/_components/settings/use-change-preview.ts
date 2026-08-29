import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  usePreviewRuntimeSetting,
  type ChangeImpact,
} from "@/lib/api/hooks/admin-settings";

import { CLEAR, type SettingsDraft } from "./use-settings-draft";

/**
 * Server-side dry run of every pending change, fetched when the apply dialog
 * opens.
 *
 * Deliberately not re-run as the operator types: the dialog is opened against
 * a frozen set of changes, and what it shows must be what the server computed
 * at the moment they asked to apply — not a stream of intermediate answers.
 */
export function useChangePreview(
  open: boolean,
  draft: SettingsDraft,
  orgId?: string,
) {
  const { t } = useTranslation();
  const preview = usePreviewRuntimeSetting(orgId);
  const [impacts, setImpacts] = useState<ChangeImpact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setImpacts([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const results: ChangeImpact[] = [];
        for (const change of draft.changes) {
          results.push(
            await preview.mutateAsync(
              change.value === CLEAR
                ? { key: change.key, clear: true }
                : { key: change.key, value: change.value },
            ),
          );
        }
        if (!cancelled) setImpacts(results);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t("admin_settings.apply.preview_failed"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Frozen against the change set the dialog opened with; see the docstring.
  }, [open]);

  return { impacts, error, loading };
}
