/**
 * The Settings tab of the interview-config page: the published-freeze banner, the
 * column of grouped cards, and the save row.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 6 of that file's
 * decomposition), then split again into per-fieldset cards (step 8). Moved last
 * because it is the largest and best-covered piece:
 * `interview-config-published-freeze.test.tsx` (18 tests) and
 * `interview-config-unsaved-guard.test.tsx` both drive this form, so a wrong cut
 * would surface immediately rather than subtly.
 */

import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type { SettingsDraft } from "@/lib/interview/config-draft";
import {
  hasFrozenFields,
  isFieldFrozen,
} from "@/lib/interview/published-field-freeze";
import { SettingsBasicsCard } from "@/routes/teacher/_components/interview-config/settings-basics-card";
import { SettingsFormFooter } from "@/routes/teacher/_components/interview-config/settings-form-footer";
import { SettingsGuidanceCard } from "@/routes/teacher/_components/interview-config/settings-guidance-card";
import { SettingsRulesCard } from "@/routes/teacher/_components/interview-config/settings-rules-card";
import { SettingsSecurityCard } from "@/routes/teacher/_components/interview-config/settings-security-card";

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
  status,
  questions = [],
  outcomesSlot,
}: {
  draft: SettingsDraft;
  setDraft: React.Dispatch<React.SetStateAction<SettingsDraft | null>>;
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
  dirty: boolean;
  justSaved: boolean;
  updatedAt: string | null;
  /** Config status. On "published", settings that change how the interview is
      conducted or graded are frozen (the backend PATCH returns 409 for them),
      so the form dims them rather than inviting an edit that cannot save. */
  status: string | null | undefined;
  /** Questions in the config's bank (role-coverage warning counts approved). */
  questions?: InterviewQuestionAuthoring[];
  /** Learning-outcomes panel, injected between Guidance and Security so the
      outcomes sit above the (now bottom-most) Security & Integrity block. */
  outcomesSlot?: React.ReactNode;
}) {
  const { t } = useTranslation();
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

      <SettingsBasicsCard
        draft={draft}
        update={update}
        lock={lock}
        status={status}
        questions={questions}
      />

      <SettingsRulesCard
        draft={draft}
        update={update}
        lock={lock}
        status={status}
        frozenReason={frozenReason}
      />

      <SettingsGuidanceCard
        draft={draft}
        update={update}
        lock={lock}
        status={status}
        frozenReason={frozenReason}
      />

      {/* Learning outcomes sit above Security & Integrity (which is now the
          bottom-most block). Injected here as a slot so it lives inside the
          settings flow without SettingsForm needing to know the outcomes API. */}
      {outcomesSlot}

      <SettingsSecurityCard draft={draft} update={update} lock={lock} />

      <SettingsFormFooter
        saving={saving}
        dirty={dirty}
        justSaved={justSaved}
        updatedAt={updatedAt}
      />
    </form>
  );
}
