/**
 * Shared prop shape for the grouped cards that make up the Settings tab.
 *
 * Split out of `settings-form.tsx` (step 8 of the interview-config
 * decomposition). Every card edits the same draft through the same `update`
 * setter and dims the same way, so the contract lives in one place: the freeze
 * predicate must keep applying to exactly the set of fields
 * `published-field-freeze.ts` names, and `lock()` is the single way a card asks
 * for it.
 */

import type { SettingsDraft } from "@/lib/interview/config-draft";

/** Frozen-field props for a `Field`, keyed by its PATCH payload name. */
export interface FieldLock {
  frozen: boolean;
  frozenReason: string;
}

export interface SettingsFieldsetProps {
  draft: SettingsDraft;
  /** Patch one draft key. No-ops when the draft has been cleared. */
  update: <K extends keyof SettingsDraft>(
    key: K,
    value: SettingsDraft[K],
  ) => void;
  /** Frozen-field props for a `Field`, keyed by its PATCH payload name. */
  lock: (field: string) => FieldLock;
  /** Config status. On "published", settings that change how the interview is
      conducted or graded are frozen (the backend PATCH returns 409 for them),
      so the form dims them rather than inviting an edit that cannot save. */
  status: string | null | undefined;
  /** Tooltip explaining the freeze, shown on every dimmed control. */
  frozenReason: string;
  /** Active learning outcomes bound the minimum-outcomes pass threshold. */
  activeOutcomeCount?: number;
}
