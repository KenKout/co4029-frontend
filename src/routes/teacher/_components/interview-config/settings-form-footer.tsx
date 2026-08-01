/**
 * The save row at the bottom of the Settings tab: the scope hint, the save-state
 * indicator, and the submit button.
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition). `SaveStatus` travels with the footer because the `key` that
 * replays its enter animation has to be set at this call site — a key on the
 * element `SaveStatus` returns would be inert, since React only diffs keys among
 * siblings.
 */

import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsFormFooter({
  saving,
  dirty,
  justSaved,
  updatedAt,
}: {
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
  updatedAt: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-m3-outline-variant/20">
      <p className="text-[11px] text-m3-on-surface-variant">
        {t("teacher_interview_config.actions.save_config_scope_hint")}
      </p>
      <div className="flex items-center gap-3 shrink-0">
        {/* Keyed on the status it will render: a key on the element returned
            *inside* SaveStatus would do nothing (React only diffs keys among
            siblings), so the remount that triggers the enter animation has to
            be forced from the call site. */}
        <SaveStatus
          key={
            saving ? "saving" : dirty ? "dirty" : justSaved ? "saved" : "idle"
          }
          saving={saving}
          dirty={dirty}
          justSaved={justSaved}
          updatedAt={updatedAt}
        />
        <Button
          type="submit"
          disabled={saving || !dirty}
          className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow shrink-0"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("teacher_interview_config.actions.save_config")}
        </Button>
      </div>
    </div>
  );
}

// Compact save-state indicator shown beside the Save button so the teacher
// always knows whether their edits are persisted: Saving… while the request
// is in flight, "Unsaved changes" (amber dot) when the draft differs from the
// saved config, and a transient "Saved" (green check) right after a save.
function SaveStatus({
  saving,
  dirty,
  justSaved,
  updatedAt,
}: {
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
  updatedAt: string | null;
}) {
  const { t, i18n } = useTranslation();

  // Every branch shares one animated shell. The remount that replays the enter
  // animation is forced by a `key` at the CALL SITE (a key here would be inert —
  // React only diffs keys among siblings). This is the feedback for the page's
  // primary action (saving settings), so the 250ms is worth it.
  // opacity+transform only → compositor-only, no reflow.
  function shell(children: React.ReactNode, className: string) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] motion-safe:animate-[fade-in-up_0.25s_ease-out_both]",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  if (saving) {
    return shell(
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t("teacher_interview_config.save_status.saving")}
      </>,
      "font-semibold text-m3-on-surface-variant",
    );
  }
  if (dirty) {
    return shell(
      <>
        <span
          className="h-2 w-2 rounded-full bg-amber-500"
          aria-hidden="true"
        />
        {t("teacher_interview_config.save_status.unsaved")}
      </>,
      "font-semibold text-amber-700",
    );
  }
  if (justSaved) {
    return shell(
      <>
        {/* Tick pops in rather than appearing flat — the one moment on this
            page worth a beat of acknowledgement. */}
        <CheckCircle2
          className="h-3.5 w-3.5 motion-safe:animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)_both]"
          aria-hidden="true"
        />
        {t("teacher_interview_config.save_status.saved")}
      </>,
      "font-semibold text-emerald-600",
    );
  }
  if (updatedAt) {
    const when = new Date(updatedAt).toLocaleString(
      i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
      { dateStyle: "medium", timeStyle: "short" },
    );
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {t("teacher_interview_config.save_status.last_saved", { when })}
      </span>
    );
  }
  return null;
}
