import { describe, expect, it } from "vitest";

import {
  hasFrozenFields,
  isFieldFrozen,
} from "@/lib/interview/published-field-freeze";

// Settings the backend freezes on a published config, because taking.py /
// orchestrator / evaluation.py read them while an interview runs or is graded.
const FROZEN = [
  // Read before a session exists, so they cannot corrupt a run in flight — but
  // they are the terms of assessment, so they freeze too.
  "max_attempts",
  "cooldown_hours",
  "persona",
  "persona_profile",
  "supported_modes",
  "tts_voice",
  "time_limit_minutes",
  "min_outcomes_to_pass",
  "supplementary_instructions",
  "security_response_policy",
  "security_max_consecutive_attempts",
  "security_custom_refusal_en",
  "security_custom_refusal_vi",
];

// Settings that stay editable — must match
// authoring.py::_PUBLISHED_EDITABLE_CONFIG_FIELDS exactly.
const EDITABLE = [
  "title",
  "security_incident_summary_enabled",
];

describe("isFieldFrozen", () => {
  it.each(FROZEN)("freezes %s on a published config", (field) => {
    expect(isFieldFrozen(field, "published")).toBe(true);
  });

  it.each(EDITABLE)("leaves %s editable on a published config", (field) => {
    expect(isFieldFrozen(field, "published")).toBe(false);
  });

  it.each(["draft", "archived"])("freezes nothing while %s", (status) => {
    for (const field of [...FROZEN, ...EDITABLE]) {
      expect(isFieldFrozen(field, status)).toBe(false);
    }
  });

  it("freezes nothing when the status is not yet known", () => {
    // The config query resolves independently; dimming the whole form during
    // load would flash a locked UI at a teacher editing a draft.
    expect(isFieldFrozen("persona", undefined)).toBe(false);
    expect(isFieldFrozen("persona", null)).toBe(false);
  });

  it("freezes an unrecognised field on a published config", () => {
    // Whitelist semantics: a field nobody has vetted must default to frozen,
    // matching the backend (which 409s anything outside its whitelist).
    expect(isFieldFrozen("some_future_setting", "published")).toBe(true);
  });
});

describe("hasFrozenFields", () => {
  it("is true only for published", () => {
    expect(hasFrozenFields("published")).toBe(true);
    expect(hasFrozenFields("draft")).toBe(false);
    expect(hasFrozenFields("archived")).toBe(false);
    expect(hasFrozenFields(undefined)).toBe(false);
  });
});
