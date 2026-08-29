import { useEffect, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";

import { ChangeImpactRow } from "./ChangeImpactRow";
import { useApplyChanges } from "./use-apply-changes";
import { useChangePreview } from "./use-change-preview";
import type { SettingsDraft } from "./use-settings-draft";

/**
 * The apply step: validate → preview scope → confirm → apply (PRD ADM-031).
 *
 * Every pending edit is previewed server-side before anything is written, so
 * what the operator confirms is what the server actually computed — not a
 * client-side guess that a stricter backend might then reject. A global change
 * additionally requires an explicit acknowledgement of its reach (ADM-032),
 * because "this changes ingestion for 14 organizations" is not something to
 * discover afterwards.
 */

const REASON_MIN_LENGTH = 3;

/**
 * Everything that must hold before the Apply button does anything.
 *
 * Extracted so the conditions read as a list rather than one long boolean: a
 * missing acknowledgement and a still-running preview are different reasons to
 * stay disabled, and both need to be obvious to whoever changes this next.
 */
function canApplyNow({
  previewing,
  applying,
  previewError,
  impactCount,
  reason,
  needsAck,
  acknowledged,
}: {
  previewing: boolean;
  applying: boolean;
  previewError: string | null;
  impactCount: number;
  reason: string;
  needsAck: boolean;
  acknowledged: boolean;
}): boolean {
  if (previewing || applying) return false;
  // A failed preview means the server has not agreed these changes are valid.
  if (previewError !== null) return false;
  if (impactCount === 0) return false;
  if (reason.trim().length < REASON_MIN_LENGTH) return false;
  return !needsAck || acknowledged;
}

export function ApplyChangesDialog({
  open,
  onClose,
  draft,
  settings,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  draft: SettingsDraft;
  settings: RuntimeSetting[];
  orgId?: string;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const { applying, applyAll } = useApplyChanges(draft, orgId);
  const {
    impacts,
    error: previewError,
    loading: previewing,
  } = useChangePreview(open, draft, orgId);

  const isGlobal = orgId === undefined;
  const byKey = new Map(settings.map((s) => [s.key, s]));

  useEffect(() => {
    if (!open) {
      setReason("");
      setAcknowledged(false);
    }
  }, [open]);

  if (!open) return null;

  const reachedOrgs = impacts.reduce(
    (max, i) => Math.max(max, i.affected_organizations),
    0,
  );
  const needsAck = isGlobal && reachedOrgs > 0;
  const canApply = canApplyNow({
    previewing,
    applying,
    previewError,
    impactCount: impacts.length,
    reason,
    needsAck,
    acknowledged,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-changes-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border px-6 py-4">
          <h2
            id="apply-changes-title"
            className="text-lg font-headline font-bold text-text-strong"
          >
            {t("admin_settings.apply.title", { count: draft.count })}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {isGlobal
              ? t("admin_settings.apply.subtitle_global")
              : t("admin_settings.apply.subtitle_org")}
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {previewing && (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {t("admin_settings.apply.previewing")}
            </p>
          )}

          {previewError && (
            <div className="rounded-lg border border-red-300 bg-red-50/60 p-4">
              <p className="text-sm text-red-700">{previewError}</p>
            </div>
          )}

          {impacts.map((impact) => (
            <ChangeImpactRow
              key={impact.key}
              impact={impact}
              setting={byKey.get(impact.key)}
            />
          ))}

          {needsAck && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-amber-800">
                <Globe aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {t("admin_settings.apply.global_warning", {
                  count: reachedOrgs,
                  total: impacts[0]?.total_organizations ?? reachedOrgs,
                })}
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(Boolean(v))}
                />
                {t("admin_settings.apply.global_ack")}
              </label>
            </div>
          )}

          <div>
            <label
              htmlFor="apply-reason"
              className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              {t("admin_settings.apply.reason_label")}
            </label>
            <Textarea
              id="apply-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder={t("admin_settings.apply.reason_placeholder")}
            />
            <p className="mt-1 text-xs text-text-muted">
              {t("admin_settings.apply.reason_hint")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={applying}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void applyAll(reason.trim(), onClose)}
            disabled={!canApply}
          >
            {applying && (
              <Loader2
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin"
              />
            )}
            {t("admin_settings.apply.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
