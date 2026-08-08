/**
 * Shape every selectable entity must expose so the dialog can render,
 * key, and dedupe rows without knowing the concrete entity type.
 */
export interface SelectableEntity {
  /** Stable identifier used as the selection key + React key. */
  id: string;
  /** Primary line (course title, student display name / email). */
  primaryLabel: string;
  /** Secondary muted line (slug, email) — optional. */
  secondaryLabel?: string | null;
  /** Optional lifecycle status rendered as a small badge on the row. */
  status?: string | null;
}
