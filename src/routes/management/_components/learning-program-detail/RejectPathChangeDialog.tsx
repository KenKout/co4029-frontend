import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PathChangeRejectionReasonCode } from "@/lib/api/types";

/**
 * Reject dialog for a career-path change request.
 *
 * A free-text-only rejection produced two bad outcomes in practice: deans typed
 * nothing (leaving the student with a bare "rejected"), or typed a different
 * sentence each time for the same situation, which makes the decisions
 * unreportable. So the reason is a CHOICE from the common cases, and the
 * backend requires it.
 *
 * `other` is the escape hatch and reveals a separate REQUIRED reason field —
 * the whole point of stepping outside the list is saying what the list could
 * not. The dean's note remains optional for every category.
 *
 * The list is a radio group rather than a `<select>`: there are seven options,
 * they are the substance of the decision, and a dropdown hides six of them
 * behind a click.
 */

/** Ordered reason list. Keys mirror the backend `PathChangeRejectionReasonCode`
 *  literal and the DB CHECK constraint; `other` stays last. */
const REASONS: {
  code: PathChangeRejectionReasonCode;
}[] = [
  { code: "insufficient_justification" },
  { code: "progress_loss_too_high" },
  { code: "target_path_not_suitable" },
  { code: "preserve_remaining_switch" },
  { code: "advising_required" },
  { code: "documentation_missing" },
  { code: "other" },
];

export function RejectPathChangeDialog({
  open,
  onOpenChange,
  studentName,
  isPending,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whose request this is — shown so a dean reviewing a queue cannot mis-target. */
  studentName: string;
  isPending: boolean;
  onReject: (
    reasonCode: PathChangeRejectionReasonCode,
    reason: string,
    note: string,
  ) => void;
}) {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] =
    useState<PathChangeRejectionReasonCode | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [note, setNote] = useState("");

  const canSubmit =
    reasonCode !== null &&
    (reasonCode !== "other" || otherReason.trim().length > 0);

  function reset() {
    setReasonCode(null);
    setOtherReason("");
    setNote("");
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
      title={t("management_learning_program_detail.reject.title", {
        name: studentName,
      })}
      description={t("management_learning_program_detail.reject.description")}
      confirmLabel={
        isPending
          ? t("management_learning_program_detail.actions.rejecting")
          : t("management_learning_program_detail.actions.reject_request")
      }
      cancelLabel={t("management_learning_program_detail.actions.cancel")}
      confirmVariant="destructive"
      popupClassName="max-w-xl"
      isPending={isPending}
      confirmDisabled={!canSubmit}
      onConfirm={() => {
        if (!reasonCode) return;
        onReject(reasonCode, otherReason.trim(), note.trim());
      }}
      extraContent={
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-text-strong">
              {t("management_learning_program_detail.reject.reason")}{" "}
              <span className="text-destructive">*</span>
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {REASONS.map((reason) => {
                const selected = reasonCode === reason.code;
                return (
                  <label
                    key={reason.code}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                      selected
                        ? "border-m3-primary bg-m3-primary-fixed/40"
                        : "border-m3-outline-variant/40 hover:bg-m3-surface-container",
                    )}
                  >
                    {/* The kit has no Radio primitive yet; Checkbox hardcodes type="checkbox". */}
                    {/* eslint-disable-next-line no-restricted-syntax */}
                    <input
                      type="radio"
                      name="path-change-reject-reason"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-m3-primary"
                      value={reason.code}
                      checked={selected}
                      disabled={isPending}
                      onChange={() => {
                        setReasonCode(reason.code);
                        if (reason.code !== "other") setOtherReason("");
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text-strong">
                        {t(
                          `management_learning_program_detail.reject.reasons.${reason.code}.label`,
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-text-muted">
                        {t(
                          `management_learning_program_detail.reject.reasons.${reason.code}.hint`,
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {reasonCode === "other" ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text-strong">
                {t("management_learning_program_detail.reject.other_reason")}{" "}
                <span className="text-destructive">*</span>
              </span>
              <Textarea
                variant="low"
                rows={2}
                maxLength={4000}
                value={otherReason}
                disabled={isPending}
                placeholder={t(
                  "management_learning_program_detail.reject.other_reason_placeholder",
                )}
                onChange={(event) => setOtherReason(event.target.value)}
              />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">
              {t("management_learning_program_detail.reject.note")}{" "}
              <span className="font-normal text-text-muted">
                {t("management_learning_program_detail.reject.optional")}
              </span>
            </span>
            <Textarea
              variant="low"
              rows={2}
              maxLength={2000}
              value={note}
              disabled={isPending}
              placeholder={t(
                "management_learning_program_detail.reject.optional_placeholder",
              )}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
      }
    />
  );
}

/** Trigger button, kept next to the dialog so the pair stays consistent. */
export function RejectButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      disabled={disabled}
      onClick={onClick}
    >
      <X className="h-4 w-4" />
      {t("management_learning_program_detail.actions.reject")}
    </Button>
  );
}
