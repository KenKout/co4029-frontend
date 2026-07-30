/**
 * Which interview-config settings are editable while the config is published.
 *
 * Mirrors the backend whitelist in
 * ``interviews/services/authoring.py::_PUBLISHED_EDITABLE_CONFIG_FIELDS``. The
 * backend is the enforcement (PATCHing a frozen field returns 409
 * ``interview_published_setting_locked``); this exists so the form can dim those
 * inputs instead of letting a teacher type into a field whose save will bounce.
 *
 * Keep the two lists in step. The backend has a test that fails when a new
 * ``InterviewConfigUpdate`` field is neither frozen nor explicitly vetted, so a
 * new setting cannot silently become editable there; here, the cost of drifting
 * is only a needlessly-dimmed or misleadingly-live input.
 *
 * Frozen fields are read by ``services/taking.py`` / ``orchestrator/`` while an
 * interview runs, or by ``services/evaluation.py`` when it is graded — changing
 * one mid-cohort means two students sit "the same" interview under different
 * rules. Unpublishing lifts every restriction.
 */

/**
 * Draft keys that may still be saved on a published config.
 *
 * Note what is NOT here: `max_attempts` / `cooldown_hours`. They are read before
 * a session exists, so editing them cannot corrupt an interview in flight — but
 * they are the terms of assessment. Lowering the cap mid-cohort strands a student
 * who already spent an attempt in good faith; raising it gives later students
 * more chances than earlier ones got.
 */
const PUBLISHED_EDITABLE_FIELDS = new Set<string>([
  "title",
  "security_incident_summary_enabled",
  "lock_quiz_ef_until_pass",
]);

/**
 * True when this settings field must be read-only for the given status.
 *
 * @param field Draft field name (matches the PATCH payload key).
 * @param status Config status; anything other than "published" is unrestricted.
 */
export function isFieldFrozen(
  field: string,
  status: string | null | undefined,
): boolean {
  if (status !== "published") return false;
  return !PUBLISHED_EDITABLE_FIELDS.has(field);
}

/**
 * Whether a published config freezes anything at all — drives the explanatory
 * banner. Always true for a published config; kept as a named helper so the
 * form reads declaratively and the reason lives in one place.
 */
export function hasFrozenFields(status: string | null | undefined): boolean {
  return status === "published";
}
