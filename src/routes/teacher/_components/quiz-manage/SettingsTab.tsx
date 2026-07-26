import * as React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { MasterySelector } from "../MasterySelector";
import { FeedbackBandsPanel } from "./FeedbackBandsPanel";
import { OverridesPanel } from "./OverridesPanel";
import { ReviewOptionsMatrix } from "./ReviewOptionsMatrix";
import {
  Field,
  LockableSection,
  SettingsSection,
  ToggleRow,
} from "./form-primitives";
import type { SettingsDraft } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Settings tab: the full quiz configuration form. Field-aware when the quiz
 * is published — student-safe fields stay editable, the rest lock per section.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 */
export function SettingsTab({
  quizId,
  draft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  onReset,
  locked = false,
}: {
  quizId: string;
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  onReset: () => void;
  /** Published quiz: freeze the non-student-safe sections. Title,
   *  description, schedule, and reminders stay editable. */
  locked?: boolean;
}) {
  const { t } = useTranslation();
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-8 shadow-glass"
    >
      <SettingsSection
        title={t("teacher_quiz_manage.settings.general.title")}
        description={t("teacher_quiz_manage.settings.general.description")}
      >
        <Field label={t("teacher_quiz_manage.settings.general.title_label")}>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t(
              "teacher_quiz_manage.settings.general.title_placeholder",
            )}
            className="bg-m3-surface text-sm"
          />
        </Field>
        <Field label={t("teacher_quiz_manage.settings.general.desc_label")}>
          <textarea
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder={t(
              "teacher_quiz_manage.settings.general.desc_placeholder",
            )}
            className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </Field>
      </SettingsSection>

      <LockableSection locked={locked}>
        <SettingsSection
          title={t("teacher_quiz_manage.settings.scoring.title")}
        >
          <Field
            label={
              <span className="flex items-center justify-between">
                <span>
                  {t("teacher_quiz_manage.settings.scoring.pass_score")}
                </span>
                <span className="text-m3-primary font-extrabold text-sm">
                  {draft.passing_score_percent}%
                </span>
              </span>
            }
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.passing_score_percent}
              onChange={(e) =>
                update("passing_score_percent", Number(e.target.value))
              }
              className="w-full h-2 rounded-full cursor-pointer accent-[var(--m3-primary)]"
            />
          </Field>
          <Field
            label={t("teacher_quiz_manage.settings.scoring.time_label")}
            hint={t("teacher_quiz_manage.settings.scoring.time_hint")}
          >
            <Input
              type="number"
              min={1}
              max={180}
              value={draft.time_limit_minutes}
              onChange={(e) => update("time_limit_minutes", e.target.value)}
              placeholder={t(
                "teacher_quiz_manage.settings.scoring.time_placeholder",
              )}
              className="bg-m3-surface text-sm w-40"
            />
          </Field>
          <Field
            label={t(
              "teacher_quiz_manage.settings.scoring.grading_method_label",
            )}
            hint={t("teacher_quiz_manage.settings.scoring.grading_method_hint")}
          >
            <Select<SettingsDraft["grading_method"]>
              value={draft.grading_method}
              onValueChange={(next) => update("grading_method", next)}
              options={[
                {
                  value: "highest",
                  label: t(
                    "teacher_quiz_manage.settings.scoring.grading_method_highest",
                  ),
                },
                {
                  value: "average",
                  label: t(
                    "teacher_quiz_manage.settings.scoring.grading_method_average",
                  ),
                },
                {
                  value: "first",
                  label: t(
                    "teacher_quiz_manage.settings.scoring.grading_method_first",
                  ),
                },
                {
                  value: "last",
                  label: t(
                    "teacher_quiz_manage.settings.scoring.grading_method_last",
                  ),
                },
              ]}
              className="w-full sm:w-72"
            />
          </Field>
        </SettingsSection>
      </LockableSection>

      <LockableSection locked={locked}>
        <SettingsSection
          title={t("teacher_quiz_manage.settings.attempts.title")}
        >
          <ToggleRow
            label={t("teacher_quiz_manage.settings.attempts.allow_label")}
            description={t("teacher_quiz_manage.settings.attempts.allow_desc")}
            value={draft.allow_retakes}
            onChange={(v) => update("allow_retakes", v)}
          />
          {draft.allow_retakes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Field
                label={t("teacher_quiz_manage.settings.attempts.max_label")}
                hint={t("teacher_quiz_manage.settings.attempts.max_hint")}
              >
                <Input
                  type="number"
                  min={1}
                  value={draft.max_attempts}
                  onChange={(e) => update("max_attempts", e.target.value)}
                  placeholder={t(
                    "teacher_quiz_manage.settings.attempts.max_placeholder",
                  )}
                  className="bg-m3-surface text-sm"
                />
              </Field>
              <Field
                label={t(
                  "teacher_quiz_manage.settings.attempts.cooldown_label",
                )}
                hint={t("teacher_quiz_manage.settings.attempts.cooldown_hint")}
              >
                <Input
                  type="number"
                  min={0}
                  value={draft.cooldown_hours}
                  onChange={(e) => update("cooldown_hours", e.target.value)}
                  placeholder={t(
                    "teacher_quiz_manage.settings.attempts.cooldown_placeholder",
                  )}
                  className="bg-m3-surface text-sm"
                />
              </Field>
            </div>
          )}
        </SettingsSection>
      </LockableSection>

      {/* Schedule stays editable on a published quiz — extending a deadline
          or shifting the open/close window doesn't disrupt a live attempt. */}
      <SettingsSection
        title={t("teacher_quiz_manage.settings.schedule.title")}
        description={t("teacher_quiz_manage.settings.schedule.description")}
      >
        {/* All three date pickers share one 2-col grid so they line up on a
            common left edge and column width. The inputs are w-full so each
            fills its cell uniformly (previously "due" was a fixed sm:w-72,
            which broke alignment with the open/close fields above it). */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t("teacher_quiz_manage.settings.schedule.open_label")}
            hint={t("teacher_quiz_manage.settings.schedule.open_hint")}
          >
            <Input
              type="datetime-local"
              value={draft.available_from}
              onChange={(e) => update("available_from", e.target.value)}
              className="bg-m3-surface text-sm w-full"
            />
          </Field>
          <Field
            label={t("teacher_quiz_manage.settings.schedule.close_label")}
            hint={t("teacher_quiz_manage.settings.schedule.close_hint")}
          >
            <Input
              type="datetime-local"
              value={draft.available_until}
              onChange={(e) => update("available_until", e.target.value)}
              className="bg-m3-surface text-sm w-full"
            />
          </Field>
          <Field
            label={t("teacher_quiz_manage.settings.schedule.due_label")}
            hint={t("teacher_quiz_manage.settings.schedule.due_hint")}
          >
            <Input
              type="datetime-local"
              value={draft.due_at}
              onChange={(e) => update("due_at", e.target.value)}
              className="bg-m3-surface text-sm w-full"
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title={t("teacher_quiz_manage.settings.behavior.title")}>
        {/* One row of four on wide screens — these are short, independent
            switches, so a single column wasted most of the width.

            The first three change how the quiz presents to a student and are
            frozen once published; reminders is a notification setting and
            stays editable. They can't be split across a `<fieldset disabled>`
            here without breaking the grid (the fieldset would be one grid
            item), so the lock is applied per card via `disabled`. */}
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.shuffle_q_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.shuffle_q_desc",
            )}
            value={draft.shuffle_questions}
            onChange={(v) => update("shuffle_questions", v)}
            disabled={locked}
          />
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.shuffle_o_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.shuffle_o_desc",
            )}
            value={draft.shuffle_options}
            onChange={(v) => update("shuffle_options", v)}
            disabled={locked}
          />
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.show_hints_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.show_hints_desc",
            )}
            value={draft.show_hints}
            onChange={(v) => update("show_hints", v)}
            disabled={locked}
          />
          <ToggleRow
            label={t("teacher_quiz_manage.settings.behavior.reminders_label")}
            description={t(
              "teacher_quiz_manage.settings.behavior.reminders_desc",
            )}
            value={draft.reminders_enabled}
            onChange={(v) => update("reminders_enabled", v)}
          />
        </div>
      </SettingsSection>

      {/* Review visibility, access/proctoring, overdue timing, overrides,
          feedback bands, and SM-2 spacing all change how the quiz is graded
          or presented under a live/finished attempt — frozen once published. */}
      <LockableSection locked={locked}>
        <div className="space-y-8">
          <SettingsSection
            title={t("teacher_quiz_manage.settings.review.title")}
            description={t("teacher_quiz_manage.settings.review.description")}
          >
            <ReviewOptionsMatrix
              value={draft.review_options}
              onChange={(next) => update("review_options", next)}
            />
          </SettingsSection>

          <SettingsSection
            title={t("teacher_quiz_manage.settings.access.title")}
            description={t("teacher_quiz_manage.settings.access.description")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("teacher_quiz_manage.settings.access.password_label")}
                hint={t("teacher_quiz_manage.settings.access.password_hint")}
              >
                <Input
                  type="text"
                  value={draft.require_password}
                  onChange={(e) => update("require_password", e.target.value)}
                  className="bg-m3-surface text-sm w-full"
                  placeholder={t(
                    "teacher_quiz_manage.settings.access.password_placeholder",
                  )}
                />
              </Field>
              <Field
                label={t("teacher_quiz_manage.settings.access.subnet_label")}
                hint={t("teacher_quiz_manage.settings.access.subnet_hint")}
              >
                <Input
                  type="text"
                  value={draft.require_subnet}
                  onChange={(e) => update("require_subnet", e.target.value)}
                  className="bg-m3-surface text-sm w-full"
                  placeholder="10.0.0.0/8, 192.168.1.5"
                />
              </Field>
            </div>
            <ToggleRow
              label={t(
                "teacher_quiz_manage.settings.access.browser_security_label",
              )}
              description={t(
                "teacher_quiz_manage.settings.access.browser_security_desc",
              )}
              value={draft.browser_security}
              onChange={(v) => update("browser_security", v)}
            />
          </SettingsSection>

          <SettingsSection
            title={t("teacher_quiz_manage.settings.timing.title")}
            description={t("teacher_quiz_manage.settings.timing.description")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("teacher_quiz_manage.settings.timing.overdue_label")}
                hint={t("teacher_quiz_manage.settings.timing.overdue_hint")}
              >
                <Select<SettingsDraft["overdue_handling"]>
                  value={draft.overdue_handling}
                  onValueChange={(next) => update("overdue_handling", next)}
                  options={[
                    {
                      value: "autosubmit",
                      label: t(
                        "teacher_quiz_manage.settings.timing.overdue_autosubmit",
                      ),
                    },
                    {
                      value: "graceperiod",
                      label: t(
                        "teacher_quiz_manage.settings.timing.overdue_graceperiod",
                      ),
                    },
                    {
                      value: "autoabandon",
                      label: t(
                        "teacher_quiz_manage.settings.timing.overdue_autoabandon",
                      ),
                    },
                  ]}
                />
              </Field>
              {draft.overdue_handling === "graceperiod" && (
                <Field
                  label={t("teacher_quiz_manage.settings.timing.grace_label")}
                  hint={t("teacher_quiz_manage.settings.timing.grace_hint")}
                >
                  <Input
                    type="number"
                    min={1}
                    value={draft.grace_period_seconds}
                    onChange={(e) =>
                      update("grace_period_seconds", e.target.value)
                    }
                    className="bg-m3-surface text-sm w-full"
                  />
                </Field>
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("teacher_quiz_manage.settings.overrides.title")}
            description={t(
              "teacher_quiz_manage.settings.overrides.description",
            )}
          >
            <OverridesPanel quizId={quizId} />
          </SettingsSection>

          <SettingsSection
            title={t("teacher_quiz_manage.settings.feedback.title")}
            description={t("teacher_quiz_manage.settings.feedback.description")}
          >
            <FeedbackBandsPanel quizId={quizId} />
          </SettingsSection>

          <SettingsSection
            title={t("teacher_quiz_manage.settings.spacing.title")}
            description={t("teacher_quiz_manage.settings.spacing.description")}
          >
            <MasterySelector
              values={{
                initial_ef: draft.initial_ef,
                min_ef_for_unlock: draft.min_ef_for_unlock,
                coverage_threshold: draft.coverage_threshold,
              }}
              onPatch={(patch) =>
                setDraft((current) =>
                  current ? { ...current, ...patch } : current,
                )
              }
            />
          </SettingsSection>
        </div>
      </LockableSection>

      {/* Sticky action bar: pins to the bottom of the viewport so the teacher
          can save from anywhere in a long form without scrolling back down.
          It only becomes an active "unsaved changes" bar when the draft
          differs from what's saved; otherwise Save is disabled and it stays
          quiet. Negative margins cancel the form's padding so the bar spans
          the full card width and reads as a footer. z-10 keeps it under the
          global ContentTopBar (frontend/AGENTS.md). */}
      <div className="sticky bottom-0 z-10 -mx-6 lg:-mx-8 -mb-6 lg:-mb-8 mt-8">
        <div
          className={cn(
            "flex items-center justify-end gap-3 px-6 lg:px-8 py-4 border-t backdrop-blur-md transition-colors rounded-b-xl",
            dirty
              ? "border-m3-primary/30 bg-m3-primary-fixed/20"
              : "border-m3-outline-variant/20 bg-m3-surface-container-lowest/80",
          )}
        >
          {dirty && (
            <span className="mr-auto text-xs font-semibold text-m3-primary">
              {t("teacher_quiz_manage.settings.unsaved_changes")}
            </span>
          )}
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={saving}
              className="gap-2"
            >
              {t("teacher_quiz_manage.settings.reset_button")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={saving || !dirty}
            className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("teacher_quiz_manage.settings.save_button")}
          </Button>
        </div>
      </div>
    </form>
  );
}
