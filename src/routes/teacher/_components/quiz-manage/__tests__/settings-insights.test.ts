import { describe, expect, it } from "vitest";
import { settingsErrors, settingsWarnings, hasMultipleAttempts } from "../settings-insights";
import { PRESETS } from "../review-options-model";
import { settingsPatchFromDraft } from "@/routes/teacher/quiz/_components/quiz-manage/helpers";
import { settingsFixture } from "./settings-fixture";

describe("quiz settings insights", () => {
  it("preserves precise scores and fractional minutes through the API round-trip", () => {
    const draft = settingsFixture();
    expect(draft.passing_score_percent).toBe(72.25);
    expect(draft.time_limit_minutes).toBe("1.5");
    const payload = settingsPatchFromDraft(draft);
    expect(payload.passing_score_percent).toBe("72.25");
    expect(payload.time_limit_seconds).toBe(90);
  });
  it.each(["2026-10-01T10:00", "2026-10-01T09:00"])("rejects close %s at or before opening", (until) => {
    expect(settingsErrors({ ...settingsFixture(), available_from: "2026-10-01T10:00", available_until: until })).toContain("close_before_open");
  });
  it("accepts open-ended and valid schedules", () => {
    expect(settingsErrors(settingsFixture())).toEqual([]);
    expect(settingsErrors({ ...settingsFixture(), available_from: "2026-10-01T10:00", available_until: "2026-10-01T11:00" })).toEqual([]);
  });
  it.each([NaN, -1, 101])("rejects invalid passing score %s", (score) => {
    expect(settingsErrors({ ...settingsFixture(), passing_score_percent: score })).toContain("invalid_score");
  });
  it("warns about delayed review without a close date, even when due date exists", () => {
    expect(settingsWarnings({ ...settingsFixture(), review_options: PRESETS.nothing_until_close(), due_at: "2026-10-01T10:00" })).toContain("review_needs_close");
  });
  it("does not warn for identical review windows or a configured close", () => {
    expect(settingsWarnings(settingsFixture())).not.toContain("review_needs_close");
    expect(settingsWarnings({ ...settingsFixture(), review_options: PRESETS.nothing_until_close(), available_until: "2026-10-01T10:00" })).not.toContain("review_needs_close");
  });
  it("makes an out-of-window due date a warning, not a new business restriction", () => {
    const draft = { ...settingsFixture(), available_until: "2026-10-01T10:00", due_at: "2026-10-02T10:00" };
    expect(settingsWarnings(draft)).toContain("due_outside_window");
    expect(settingsErrors(draft)).toEqual([]);
  });
  it("only exposes multi-attempt grading when more than one attempt is possible", () => {
    expect(hasMultipleAttempts({ allow_retakes: false, max_attempts: "" })).toBe(false);
    expect(hasMultipleAttempts({ allow_retakes: true, max_attempts: "1" })).toBe(false);
    expect(hasMultipleAttempts({ allow_retakes: true, max_attempts: "" })).toBe(true);
    expect(hasMultipleAttempts({ allow_retakes: true, max_attempts: "3" })).toBe(true);
  });
});
