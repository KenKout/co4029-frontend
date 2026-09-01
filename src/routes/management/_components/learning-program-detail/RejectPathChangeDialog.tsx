import { useState } from "react";
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
 * `other` is the escape hatch and it flips the note field to REQUIRED — the
 * whole point of stepping outside the list is saying what the list could not.
 * The dean's note is always allowed on top of a canned reason, because "your
 * justification was insufficient" is more useful with a sentence attached.
 *
 * The list is a radio group rather than a `<select>`: there are seven options,
 * they are the substance of the decision, and a dropdown hides six of them
 * behind a click.
 */

/** Ordered reason list. Keys mirror the backend `PathChangeRejectionReasonCode`
 *  literal and the DB CHECK constraint; `other` stays last. */
const REASONS: {
  code: PathChangeRejectionReasonCode;
  label: string;
  hint: string;
}[] = [
  {
    code: "insufficient_justification",
    label: "Justification is not sufficient",
    hint: "The stated reason does not support a path change.",
  },
  {
    code: "progress_loss_too_high",
    label: "Too much progress would be lost",
    hint: "Switching now would discard significant completed work.",
  },
  {
    code: "target_path_not_suitable",
    label: "Target path is not a suitable fit",
    hint: "The requested path does not match the student's record.",
  },
  {
    code: "preserve_remaining_switch",
    label: "Keep the remaining switch for later",
    hint: "The student's remaining budget is better saved.",
  },
  {
    code: "advising_required",
    label: "Advising conversation needed first",
    hint: "Discuss with the student before any switch.",
  },
  {
    code: "documentation_missing",
    label: "Supporting information missing",
    hint: "Required evidence was not provided with the request.",
  },
  {
    code: "other",
    label: "Other (explain below)",
    hint: "A written explanation is required.",
  },
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
  onReject: (reasonCode: PathChangeRejectionReasonCode, note: string) => void;
}) {
  const [reasonCode, setReasonCode] =
    useState<PathChangeRejectionReasonCode | null>(null);
  const [note, setNote] = useState("");

  const noteRequired = reasonCode === "other";
  const canSubmit =
    reasonCode !== null && (!noteRequired || note.trim().length > 0);

  function reset() {
    setReasonCode(null);
    setNote("");
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
      title={`Reject path change for ${studentName}?`}
      description={
        "The student keeps their current path and is notified with the reason " +
        "you pick. This does not use up one of their path changes."
      }
      confirmLabel={isPending ? "Rejecting…" : "Reject request"}
      cancelLabel="Cancel"
      confirmVariant="destructive"
      isPending={isPending}
      confirmDisabled={!canSubmit}
      onConfirm={() => {
        if (!reasonCode) return;
        onReject(reasonCode, note.trim());
      }}
      extraContent={
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-text-strong">
              Reason <span className="text-destructive">*</span>
            </legend>
            <div className="space-y-1.5">
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
                    <input
                      type="radio"
                      name="path-change-reject-reason"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-m3-primary"
                      value={reason.code}
                      checked={selected}
                      disabled={isPending}
                      onChange={() => setReasonCode(reason.code)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text-strong">
                        {reason.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-text-muted">
                        {reason.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-strong">
              Note to the student{" "}
              {noteRequired ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="font-normal text-text-muted">(optional)</span>
              )}
            </span>
            <Textarea
              variant="low"
              rows={3}
              maxLength={2000}
              value={note}
              disabled={isPending}
              placeholder={
                noteRequired
                  ? "Explain the reason for this rejection…"
                  : "Add any detail the student should know…"
              }
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
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      disabled={disabled}
      onClick={onClick}
    >
      <X className="h-4 w-4" /> Reject
    </Button>
  );
}
