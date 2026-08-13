import { describe, expect, it } from "vitest";

import type { InterviewConfigAuthoring } from "@/lib/api/types";
import {
  buildConfigUpdatePayload,
  draftFromConfig,
} from "@/routes/teacher/_components/interview-config/draft-mapping";
import type { SettingsDraft } from "@/lib/interview/config-draft";

/**
 * The published-freeze PATCH contract.
 *
 * The backend freeze (`assert_config_settings_editable`) rejects ANY field it
 * receives on a published config unless that field is whitelisted — it has no
 * way to know a field's value is unchanged, only that it was sent. So the
 * client must send only what actually changed. These tests pin that contract:
 * a title-only edit on a published interview must produce a title-only PATCH,
 * or the teacher gets the 409 they are trying to avoid.
 */

function savedConfig(overrides: Partial<InterviewConfigAuthoring> = {}): InterviewConfigAuthoring {
  return {
    id: "00000000-0000-0000-0001-000000000001",
    course_id: "00000000-0000-0000-0000-000000000002",
    module_id: "00000000-0000-0000-0000-000000000003",
    title: "Voice demo",
    status: "published",
    persona: "neutral",
    supported_modes: "hybrid",
    tts_voice: null,
    time_limit_minutes: 10,
    max_attempts: 2,
    cooldown_hours: 24,
    min_outcomes_to_pass: 2,
    lock_quiz_ef_until_pass: false,
    supplementary_instructions: null,
    security_response_policy: "warn_and_continue",
    security_max_consecutive_attempts: 3,
    security_custom_refusal_en: null,
    security_custom_refusal_vi: null,
    security_incident_summary_enabled: true,
    persona_profile_resolved: null,
    ...overrides,
  } as InterviewConfigAuthoring;
}

describe("buildConfigUpdatePayload diffing", () => {
  it("sends ONLY the title when a published config's title is edited", () => {
    const saved = savedConfig();
    const baseline = {
      ...draftFromConfig(saved),
      supported_modes: saved.supported_modes,
    };
    const draft: SettingsDraft = {
      ...baseline,
      title: "Voice demo (renamed)",
    };
    const payload = buildConfigUpdatePayload(draft, baseline);
    expect(payload).toEqual({ title: "Voice demo (renamed)" });
  });

  it("sends an empty PATCH when nothing changed", () => {
    const saved = savedConfig();
    const baseline = {
      ...draftFromConfig(saved),
      supported_modes: saved.supported_modes,
    };
    expect(buildConfigUpdatePayload(baseline, baseline)).toEqual({});
  });

  it("still re-normalizes a legacy text config to hybrid on save", () => {
    // `draftFromConfig` hardcodes hybrid (the mode selector was removed), so
    // the caller supplies the config's REAL supported_modes as the baseline
    // — otherwise a legacy text/voice config would never be re-normalized.
    const saved = savedConfig({ supported_modes: "text" });
    // Real page flow: the form draft normalizes to hybrid (mode selector was
    // removed), while the baseline carries the DB's actual "text".
    const baseline = {
      ...draftFromConfig(saved),
      supported_modes: saved.supported_modes, // "text" — what the DB holds
    };
    const draft = {
      ...draftFromConfig(saved), // "hybrid" — what the form holds
      title: "Voice demo (renamed)",
    };
    const payload = buildConfigUpdatePayload(draft, baseline);
    // hybrid because the draft normalizes to it; title because it changed.
    expect(payload).toEqual({
      title: "Voice demo (renamed)",
      supported_modes: "hybrid",
    });
  });

  it("includes a frozen field ONLY when it actually changed", () => {
    const saved = savedConfig();
    const baseline = {
      ...draftFromConfig(saved),
      supported_modes: saved.supported_modes,
    };
    const draft: SettingsDraft = {
      ...baseline,
      time_limit_minutes: "15",
    };
    const payload = buildConfigUpdatePayload(draft, baseline);
    expect(payload).toEqual({ time_limit_minutes: 15 });
  });

  it("sends the full payload when no baseline is supplied (legacy callers)", () => {
    const draft = draftFromConfig(savedConfig()) as SettingsDraft;
    const payload = buildConfigUpdatePayload(draft);
    expect(Object.keys(payload).length).toBeGreaterThan(10);
    expect(payload.title).toBe("Voice demo");
  });
});
