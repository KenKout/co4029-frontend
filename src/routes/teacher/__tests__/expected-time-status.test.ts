import { describe, expect, it } from "vitest";

/**
 * Regression tests for the expected-response-time status logic in
 * quiz-manage.tsx.
 *
 * The bug these pin: `buildQuestionDraft` pre-fills DEFAULT_EXPECTED_SECONDS
 * when the saved row has no expected time. The dirty check used to compare the
 * draft against `buildQuestionDraft(question)`, which injected the SAME default
 * on both sides — so the phantom default cancelled out. Result: the field looked
 * populated, the row stayed null, the question did NOT register as unsaved, and
 * the banner still claimed the time was "missing". Misleading on all three
 * counts.
 *
 * These tests mirror the logic in the component rather than importing it (the
 * component is a 3.4k-line route module with heavy provider requirements). They
 * exist to lock in the *decision table*, which is the part that was wrong.
 */

const DEFAULT_EXPECTED_SECONDS = 60;

interface Row {
  expected_response_time_ms: number | null;
}

/** Shared predicate: does the SAVED row lack a usable expected time? */
function hasInvalidExpectedTime(q: Row): boolean {
  const ms = q.expected_response_time_ms;
  return ms == null || ms <= 0;
}

/** What buildQuestionDraft puts in the editor field (pre-fills the default). */
function draftSeconds(q: Row): number | null {
  return q.expected_response_time_ms == null
    ? DEFAULT_EXPECTED_SECONDS
    : Math.round(q.expected_response_time_ms / 1000);
}

/** The FIXED baseline: raw saved value, no default injected. */
function savedBaselineSeconds(q: Row): number | null {
  return q.expected_response_time_ms == null
    ? null
    : Math.round(q.expected_response_time_ms / 1000);
}

/** The OLD (buggy) baseline: defaulted on both sides. */
function buggyBaselineSeconds(q: Row): number | null {
  return draftSeconds(q);
}

describe("expected response time — dirty detection", () => {
  const nullRow: Row = { expected_response_time_ms: null };

  it("OLD behaviour: pre-filled default was invisible to the dirty check", () => {
    // Both sides get the injected default, so they compare equal → "saved".
    expect(draftSeconds(nullRow)).toBe(DEFAULT_EXPECTED_SECONDS);
    expect(buggyBaselineSeconds(nullRow)).toBe(DEFAULT_EXPECTED_SECONDS);
    expect(draftSeconds(nullRow) === buggyBaselineSeconds(nullRow)).toBe(true);
  });

  it("FIXED: a pre-filled default now registers as an unsaved edit", () => {
    // Field shows 60, saved row is null → genuinely unsaved.
    expect(draftSeconds(nullRow)).toBe(DEFAULT_EXPECTED_SECONDS);
    expect(savedBaselineSeconds(nullRow)).toBeNull();
    expect(draftSeconds(nullRow) === savedBaselineSeconds(nullRow)).toBe(false);
  });

  it("a genuinely saved value is NOT reported as unsaved", () => {
    const saved: Row = { expected_response_time_ms: 45_000 };
    expect(draftSeconds(saved)).toBe(45);
    expect(savedBaselineSeconds(saved)).toBe(45);
    expect(draftSeconds(saved) === savedBaselineSeconds(saved)).toBe(true);
  });

  it("treats zero/negative as invalid, not just null", () => {
    expect(hasInvalidExpectedTime({ expected_response_time_ms: 0 })).toBe(true);
    expect(hasInvalidExpectedTime({ expected_response_time_ms: -1 })).toBe(
      true,
    );
    expect(hasInvalidExpectedTime({ expected_response_time_ms: null })).toBe(
      true,
    );
    expect(hasInvalidExpectedTime({ expected_response_time_ms: 1000 })).toBe(
      false,
    );
  });
});

describe("banner + navigator classification", () => {
  /** Per-cell / per-banner split, mirroring the component. */
  function classify(q: Row, dirty: boolean) {
    const noSavedTime = hasInvalidExpectedTime(q);
    return {
      // Amber "save these" state: editor has a value, row doesn't.
      unsavedDefault: noSavedTime && dirty,
      // Red error state: row has nothing AND nothing pending to save.
      error: noSavedTime && !dirty,
    };
  }

  it("null row WITH pending edits → amber 'needs saving', not a red error", () => {
    const c = classify({ expected_response_time_ms: null }, true);
    expect(c.unsavedDefault).toBe(true);
    expect(c.error).toBe(false);
  });

  it("null row with NO pending edits → red error (genuinely blank)", () => {
    const c = classify({ expected_response_time_ms: null }, false);
    expect(c.unsavedDefault).toBe(false);
    expect(c.error).toBe(true);
  });

  it("saved row is neither state, dirty or not", () => {
    for (const dirty of [true, false]) {
      const c = classify({ expected_response_time_ms: 30_000 }, dirty);
      expect(c.unsavedDefault).toBe(false);
      expect(c.error).toBe(false);
    }
  });

  it("the two banner populations are disjoint and cover every affected row", () => {
    const rows: Array<[Row, boolean]> = [
      [{ expected_response_time_ms: null }, true],
      [{ expected_response_time_ms: null }, false],
      [{ expected_response_time_ms: 0 }, true],
      [{ expected_response_time_ms: 20_000 }, false],
    ];
    let unsaved = 0;
    let errors = 0;
    for (const [row, dirty] of rows) {
      const c = classify(row, dirty);
      // Never both at once — that double-reporting was the misleading part.
      expect(c.unsavedDefault && c.error).toBe(false);
      if (c.unsavedDefault) unsaved += 1;
      if (c.error) errors += 1;
    }
    expect(unsaved).toBe(2); // the two null/0 rows with pending edits
    expect(errors).toBe(1); // the null row with nothing to save
    // Together they account for every row lacking a saved time.
    expect(unsaved + errors).toBe(
      rows.filter(([r]) => hasInvalidExpectedTime(r)).length,
    );
  });
});
