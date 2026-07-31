/**
 * The Settings tab of the interview-config page, plus its save-status line.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 6 of that file's
 * decomposition). Moved last because it is the largest and best-covered piece:
 * `interview-config-published-freeze.test.tsx` (18 tests) and
 * `interview-config-unsaved-guard.test.tsx` both drive this form, so a wrong cut
 * would surface immediately rather than subtly.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { useTranslation } from "react-i18next";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  INTERVIEWER_ROLE_KEYS,
  PERSONA_KEYS,
  PERSONA_TRAIT_KEYS,
  VOICE_KEYS,
  effectivePersonaTraits,
  type InterviewerRole,
  type Persona,
  type SecurityResponsePolicy,
  type SettingsDraft,
} from "@/lib/interview/config-draft";
import {
  hasFrozenFields,
  isFieldFrozen,
} from "@/lib/interview/published-field-freeze";
import { cn } from "@/lib/utils";
import {
  Field,
  SettingsCard,
  ToggleRow,
} from "@/routes/teacher/_components/interview-config/form-primitives";
import {
  RubricEditor,
  VoicePersonaGuideSheet,
} from "@/routes/teacher/_components/interview-config/rubric-and-guide";

/**
 * The settings tab, laid out as a column of grouped cards
 * (FormBold-style grouping) instead of one long scrolling column — keeps the
 * existing Material 3 tokens.
 */
/** Exported for tests: asserts which inputs the published freeze disables. */
export function SettingsForm({
  draft,
  setDraft,
  onSubmit,
  saving,
  dirty,
  justSaved,
  updatedAt,
  practiceQuestionCount,
  status,
  outcomesSlot,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
  updatedAt: string | null;
  /** Approved questions in the practice partition. Zero means enabling practice
      changes nothing, which the form says out loud rather than leaving the
      teacher to find out from a student. */
  practiceQuestionCount: number;
  /** Config status. On "published", settings that change how the interview is
      conducted or graded are frozen (the backend PATCH returns 409 for them),
      so the form dims them rather than inviting an edit that cannot save. */
  status: string | null | undefined;
  /** Learning-outcomes panel, injected between Guidance and Security so the
      outcomes sit above the (now bottom-most) Security & Integrity block. */
  outcomesSlot?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [personaAdvancedOpen, setPersonaAdvancedOpen] = useState(false);
  const anyFrozen = hasFrozenFields(status);
  const frozenReason = t("teacher_interview_config.published_freeze.tooltip");
  /** Frozen-field props for a `Field`, keyed by its PATCH payload name. */
  const lock = (field: string) => ({
    frozen: isFieldFrozen(field, status),
    frozenReason,
  });
  function update<K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Why half the form is dimmed. Without this, a greyed-out field reads as
          a bug or a permissions problem; the fix (unpublish) is not guessable. */}
      {anyFrozen && (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t("teacher_interview_config.published_freeze.banner")}</p>
        </div>
      )}

      {/* Card 1 — Basics: identity + interviewer style grouped together, with
          persona/voice on one row (FormBold-style two-up layout). */}
      <SettingsCard
        stagger={0}
        title={t("teacher_interview_config.sections.general.title")}
        description={t("teacher_interview_config.sections.general.description")}
      >
        <Field label={t("teacher_interview_config.fields.title")}>
          <Input
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("teacher_interview_config.fields.title_placeholder")}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t("teacher_interview_config.fields.persona")}
            {...lock("persona")}
          >
            <Select<Persona>
              value={draft.persona}
              onValueChange={(next) => update("persona", next)}
              options={PERSONA_KEYS.map((p) => ({
                value: p,
                label: t(`teacher_interview_config.persona.${p}`),
              }))}
            />
            <VoicePersonaGuideSheet focus="persona" />
          </Field>
          {/* Who the interviewer presents as. Orthogonal to persona: persona is
              HOW they sound, this is WHO they are. Like persona it shapes
              language only — never difficulty, question choice, or scoring. */}
          <Field
            label={t("teacher_interview_config.fields.interviewer_role")}
            hint={t("teacher_interview_config.fields.interviewer_role_hint")}
            {...lock("persona_profile")}
          >
            <Select<InterviewerRole>
              value={
                draft.persona_profile.interviewer_role ?? "generic_assistant"
              }
              onValueChange={(next) =>
                update("persona_profile", {
                  ...draft.persona_profile,
                  interviewer_role: next,
                })
              }
              options={INTERVIEWER_ROLE_KEYS.map((r) => ({
                value: r,
                label: t(`teacher_interview_config.interviewer_role.${r}`),
              }))}
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.voice_label")}
            hint={t("teacher_interview_config.fields.voice_hint")}
            {...lock("tts_voice")}
          >
            <Select
              value={draft.tts_voice}
              onValueChange={(next) => update("tts_voice", next)}
              options={[
                {
                  value: "",
                  label: t("teacher_interview_config.fields.voice_default"),
                },
                ...VOICE_KEYS.map((v) => ({
                  value: v as string,
                  label: t(`teacher_interview_config.voice.${v}`),
                })),
              ]}
            />
            <VoicePersonaGuideSheet focus="voice" />
          </Field>
        </div>

        {/* Advanced: optional per-trait persona overrides (Phase 3). Collapsed
            by default — the persona preset is enough for most teachers; the
            sliders let a power user fine-tune tone without a new persona. Every
            dial is TONE ONLY and never affects scoring (backend enforces this).
            An override exists only for a trait moved away from its preset.

            Base UI Collapsible rather than the hand-rolled grid-rows trick this
            used to share with the Security panel. Two reasons, both correctness
            rather than polish: the old version left the collapsed content in the
            DOM at opacity-0, so every slider inside stayed in the tab order and
            keyboard users landed on invisible controls; and it animated a grid
            track, which is a layout property recomputed every frame, against
            this file's own compositor-only convention. Collapsible unmounts the
            panel when closed and animates its height via a CSS variable. */}
        <Collapsible.Root
          open={personaAdvancedOpen}
          onOpenChange={setPersonaAdvancedOpen}
          className={cn(
            "mt-4 block rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4",
            isFieldFrozen("persona_profile", status) && "opacity-60",
          )}
        >
          <Collapsible.Trigger className="flex w-full cursor-pointer list-none items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-m3-primary/10 text-m3-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-m3-on-surface">
                {t("teacher_interview_config.persona_traits.advanced_label")}
                {isFieldFrozen("persona_profile", status) && (
                  <Lock
                    className="ml-1.5 inline-block h-3 w-3 align-text-top"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="block text-xs text-m3-on-surface-variant">
                {t("teacher_interview_config.persona_traits.help")}
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300 ${
                personaAdvancedOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </Collapsible.Trigger>

          <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div>
              <div className="mt-5 space-y-4 border-t border-m3-outline-variant/20 pt-5">
                {(() => {
                  const effective = effectivePersonaTraits(
                    draft.persona,
                    draft.persona_profile,
                  );
                  return PERSONA_TRAIT_KEYS.map((traitKey) => (
                    <div key={traitKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`persona-trait-${traitKey}`}
                          className="text-xs font-medium text-m3-on-surface"
                        >
                          {t(
                            `teacher_interview_config.persona_traits.trait.${traitKey}`,
                          )}
                        </label>
                        <span className="text-xs tabular-nums text-m3-on-surface-variant">
                          {effective[traitKey]} / 4
                        </span>
                      </div>
                      <input
                        id={`persona-trait-${traitKey}`}
                        type="range"
                        min={0}
                        max={4}
                        step={1}
                        value={effective[traitKey]}
                        disabled={isFieldFrozen("persona_profile", status)}
                        onChange={(e) =>
                          update("persona_profile", {
                            ...draft.persona_profile,
                            [traitKey]: Number(e.target.value),
                          })
                        }
                        className="w-full cursor-pointer accent-m3-primary disabled:cursor-not-allowed"
                      />
                      <p className="text-[11px] text-m3-on-surface-variant">
                        {t(
                          `teacher_interview_config.persona_traits.trait_hint.${traitKey}`,
                        )}
                      </p>
                    </div>
                  ));
                })()}
                <button
                  type="button"
                  onClick={() => update("persona_profile", {})}
                  disabled={isFieldFrozen("persona_profile", status)}
                  className="text-xs font-medium text-m3-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                >
                  {t("teacher_interview_config.persona_traits.reset")}
                </button>
              </div>
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      </SettingsCard>

      {/* Card 2 — Scoring & timing: the three numeric knobs on one 3-up row. */}
      <SettingsCard
        stagger={1}
        title={t("teacher_interview_config.sections.rules.title")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All three are unbounded-by-default numeric knobs whose empty state
              means something ("unlimited"), so each carries its unit inside the
              field — an anonymous empty box gave no clue whether it wanted
              minutes, seconds or a count. */}
          <Field
            label={t("teacher_interview_config.fields.duration_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
            {...lock("time_limit_minutes")}
          >
            <Input
              type="number"
              min={1}
              max={180}
              value={draft.time_limit_minutes}
              onChange={(e) => update("time_limit_minutes", e.target.value)}
              placeholder={t(
                "teacher_interview_config.fields.duration_placeholder",
              )}
              endAdornment={t("teacher_interview_config.units.minutes")}
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.attempts_label")}
            hint={t("teacher_interview_config.fields.duration_hint")}
            {...lock("max_attempts")}
          >
            <Input
              type="number"
              min={1}
              value={draft.max_attempts}
              onChange={(e) => update("max_attempts", e.target.value)}
              placeholder={t(
                "teacher_interview_config.fields.attempts_placeholder",
              )}
              endAdornment={t("teacher_interview_config.units.attempts")}
            />
          </Field>
          <Field
            label={t("teacher_interview_config.fields.criteria_label")}
            hint={t("teacher_interview_config.fields.criteria_hint")}
            {...lock("min_outcomes_to_pass")}
          >
            <Input
              type="number"
              min={1}
              value={draft.min_outcomes_to_pass}
              onChange={(e) => update("min_outcomes_to_pass", e.target.value)}
              placeholder={t(
                "teacher_interview_config.fields.criteria_placeholder",
              )}
              endAdornment={t("teacher_interview_config.units.outcomes")}
            />
          </Field>
        </div>

        {/* Practice mode. Full width under the numeric grid because it needs
            two lines of consequence text, not a one-line hint. */}
        <div
          className={cn(
            "mt-4 rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest p-3",
            isFieldFrozen("practice_mode_enabled", status) && "opacity-60",
          )}
          title={
            isFieldFrozen("practice_mode_enabled", status)
              ? frozenReason
              : undefined
          }
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={draft.practice_mode_enabled}
              disabled={isFieldFrozen("practice_mode_enabled", status)}
              onChange={(e) =>
                update("practice_mode_enabled", e.target.checked)
              }
              className="mt-0.5 size-4 shrink-0 accent-m3-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-m3-on-surface">
                {t("teacher_interview_config.fields.practice_label")}
              </span>
              <span className="mt-1 block text-xs leading-5 text-m3-on-surface-variant">
                {t("teacher_interview_config.fields.practice_hint")}
              </span>
            </span>
          </label>

          {/* Both consequences of ticking this box, stated rather than
              discovered: it discloses criterion text to students, and it does
              nothing at all until questions are moved into the practice set. */}
          {draft.practice_mode_enabled && (
            <div className="mt-3 space-y-2 border-t border-m3-outline-variant/30 pt-3">
              <p className="text-xs leading-5 text-m3-on-surface-variant">
                {t("teacher_interview_config.fields.practice_rubric_notice")}
              </p>
              {practiceQuestionCount === 0 && (
                <p
                  className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold leading-5 text-amber-800"
                  role="status"
                >
                  <TriangleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {t("teacher_interview_config.fields.practice_empty_warning")}
                </p>
              )}
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Card 3 — Guidance for AI: free-text prose (fed to the question
          generator) plus the structured scoring rubric (graded against). */}
      <SettingsCard
        stagger={2}
        title={t("teacher_interview_config.sections.guidance.title")}
        description={t(
          "teacher_interview_config.sections.guidance.description",
        )}
      >
        <Field
          label={t("teacher_interview_config.fields.notes_label")}
          hint={t("teacher_interview_config.fields.notes_hint")}
          {...lock("supplementary_instructions")}
        >
          <Textarea
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder={t(
              "teacher_interview_config.fields.supplementary_placeholder",
            )}
          />
        </Field>

        {/* The rubric is serialized into supplementary_instructions, which the
            evaluator reads — so it freezes with that field, not separately. */}
        <div
          className={cn(
            isFieldFrozen("supplementary_instructions", status) &&
              "pointer-events-none opacity-60",
          )}
          title={
            isFieldFrozen("supplementary_instructions", status)
              ? frozenReason
              : undefined
          }
          aria-disabled={
            isFieldFrozen("supplementary_instructions", status) || undefined
          }
        >
          <RubricEditor
            criteria={draft.rubric_criteria}
            onChange={(next) => update("rubric_criteria", next)}
          />
        </div>
      </SettingsCard>

      {/* Learning outcomes sit above Security & Integrity (which is now the
          bottom-most block). Injected here as a slot so it lives inside the
          settings flow without SettingsForm needing to know the outcomes API. */}
      {outcomesSlot}

      {/* Collapsible for the same reasons as the persona panel above: this one
          holds a response-policy select, a max-attempts number and two custom
          refusal textareas, all of which stayed tabbable while the section was
          closed. */}
      <Collapsible.Root
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        className="block rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-4"
      >
        <Collapsible.Trigger className="flex w-full cursor-pointer list-none items-center gap-3 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-m3-on-surface">
              {t("teacher_interview_config.security.title")}
            </span>
            <span className="block text-xs text-m3-on-surface-variant">
              {t("teacher_interview_config.security.description")}
            </span>
          </span>
          <span className="text-xs font-bold text-emerald-700">
            {t("teacher_interview_config.security.mandatory")}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300 ${
              securityOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </Collapsible.Trigger>

        <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <div>
            <div className="mt-5 space-y-5 border-t border-m3-outline-variant/20 pt-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_interview_config.security.protected_by_platform")}
                </p>
                <ul className="mt-2 grid gap-2 text-sm text-m3-on-surface sm:grid-cols-2">
                  {["questions", "answers", "rubrics", "prompts", "state"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        {t(
                          `teacher_interview_config.security.protected.${item}`,
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("teacher_interview_config.security.response_policy")}
                  {...lock("security_response_policy")}
                >
                  <Select<SecurityResponsePolicy>
                    value={draft.security_response_policy}
                    onValueChange={(next) =>
                      update("security_response_policy", next)
                    }
                    options={(
                      [
                        "continue_and_log",
                        "warn_and_continue",
                        "end_and_flag",
                      ] as SecurityResponsePolicy[]
                    ).map((policy) => ({
                      value: policy,
                      label: t(
                        `teacher_interview_config.security.policy.${policy}`,
                      ),
                    }))}
                  />
                </Field>
                <Field
                  label={t("teacher_interview_config.security.max_attempts")}
                  {...lock("security_max_consecutive_attempts")}
                >
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={draft.security_max_consecutive_attempts}
                    onChange={(e) =>
                      update(
                        "security_max_consecutive_attempts",
                        e.target.value,
                      )
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4">
                <Field
                  label={t("teacher_interview_config.security.custom_en")}
                  {...lock("security_custom_refusal_en")}
                >
                  <Textarea
                    rows={3}
                    maxLength={500}
                    value={draft.security_custom_refusal_en}
                    onChange={(e) =>
                      update("security_custom_refusal_en", e.target.value)
                    }
                  />
                  <p className="mt-2 rounded-lg bg-m3-surface-container px-3 py-2 text-xs text-m3-on-surface-variant">
                    {draft.security_custom_refusal_en.trim() ||
                      t("teacher_interview_config.security.preview_en")}
                  </p>
                </Field>
              </div>

              <ToggleRow
                label={t("teacher_interview_config.security.incident_summary")}
                description={t(
                  "teacher_interview_config.security.incident_summary_description",
                )}
                value={draft.security_incident_summary_enabled}
                onChange={(value) =>
                  update("security_incident_summary_enabled", value)
                }
              />
              <p className="text-[11px] text-m3-on-surface-variant">
                {t("teacher_interview_config.security.rules_hidden")}
              </p>
            </div>
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>

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
    </form>
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
