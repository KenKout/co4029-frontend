import { describe, expect, it, vi } from "vitest";

import type { TFunction } from "i18next";
import { toast } from "sonner";

import type { InterviewConfigAuthoring } from "@/lib/api/types";
import {
  buildConfigUpdatePayload,
  draftFromConfig,
  isDraftDirty,
  reconcileDraftWithConfig,
} from "@/routes/teacher/_components/interview-config/draft-mapping";
import { createConfigActions } from "@/routes/teacher/_components/interview-config/config-page-actions";
import type { SettingsDraft } from "@/lib/interview/config-draft";
import { useGenerateInterviewQuestions } from "@/lib/api/hooks/interviews";
import type { useConfigMutations } from "@/routes/teacher/_components/interview-config/use-config-mutations";

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

function savedConfig(
  overrides: Partial<InterviewConfigAuthoring> = {},
): InterviewConfigAuthoring {
  return {
    id: "00000000-0000-0000-0001-000000000001",
    course_id: "00000000-0000-0000-0000-000000000002",
    module_id: "00000000-0000-0000-0000-000000000003",
    title: "Voice demo",
    status: "published",
    persona: "neutral",
    tts_voice: null,
    time_limit_minutes: 10,
    max_attempts: 2,
    cooldown_hours: 24,
    min_outcomes_to_pass: 2,
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
    const baseline = draftFromConfig(saved);
    const draft: SettingsDraft = {
      ...baseline,
      title: "Voice demo (renamed)",
    };
    const payload = buildConfigUpdatePayload(draft, baseline);
    expect(payload).toEqual({ title: "Voice demo (renamed)" });
  });

  it("sends an empty PATCH when nothing changed", () => {
    const baseline = draftFromConfig(savedConfig());
    expect(buildConfigUpdatePayload(baseline, baseline)).toEqual({});
  });

  it("includes a frozen field ONLY when it actually changed", () => {
    const baseline = draftFromConfig(savedConfig());
    const draft: SettingsDraft = {
      ...baseline,
      time_limit_minutes: "15",
    };
    const payload = buildConfigUpdatePayload(draft, baseline);
    expect(payload).toEqual({ time_limit_minutes: 15 });
  });

  it("sends the full payload when no baseline is supplied (legacy callers)", () => {
    const draft = draftFromConfig(savedConfig());
    const payload = buildConfigUpdatePayload(draft);
    expect(Object.keys(payload).length).toBeGreaterThan(10);
    expect(payload.title).toBe("Voice demo");
  });
});

describe("isDraftDirty", () => {
  const config = savedConfig();

  it("is clean when the draft matches the saved config", () => {
    const draft = draftFromConfig(config);
    expect(isDraftDirty(draft, config)).toBe(false);
  });

  it("is clean for an edit that normalizes to the stored value (title whitespace)", () => {
    const draft: SettingsDraft = {
      ...draftFromConfig(config),
      title: "Voice demo ",
    };
    expect(isDraftDirty(draft, config)).toBe(false);
  });

  it("is clean for a numeric knob cleared while it already holds its default", () => {
    // "" and "3" both serialize to the shipped default 3 → nothing to PATCH.
    const draft: SettingsDraft = {
      ...draftFromConfig(config),
      max_hints_per_question: "",
    };
    expect(isDraftDirty(draft, config)).toBe(false);
  });

  it("is dirty when a real value is cleared (nullable field)", () => {
    const draft: SettingsDraft = {
      ...draftFromConfig(config),
      time_limit_minutes: "",
    };
    expect(isDraftDirty(draft, config)).toBe(true);
  });

  it("is dirty for any payload-visible change", () => {
    const rename: SettingsDraft = {
      ...draftFromConfig(config),
      title: "Voice demo (renamed)",
    };
    expect(isDraftDirty(rename, config)).toBe(true);
  });
});

describe("saveSettings guards against a no-op save", () => {
  function makeActions(draft: SettingsDraft) {
    const setDraft = vi.fn();
    const updateMutateAsync = vi
      .fn()
      .mockImplementation((patch: Partial<InterviewConfigAuthoring>) =>
        Promise.resolve(savedConfig(patch)),
      );
    const t = ((key: string) => key) as TFunction;
    const actions = createConfigActions({
      t,
      draft,
      config: savedConfig(),
      courseId: "00000000-0000-0000-0000-000000000002",
      generationForm: {} as never,
      mutations: {
        updateConfig: {
          mutateAsync: updateMutateAsync,
          isPending: false,
          reset: vi.fn(),
        },
        publishConfig: {
          mutateAsync: vi.fn(),
          isPending: false,
          reset: vi.fn(),
        },
        archiveConfig: {
          mutateAsync: vi.fn(),
          isPending: false,
          reset: vi.fn(),
        },
        unarchiveConfig: {
          mutateAsync: vi.fn(),
          isPending: false,
          reset: vi.fn(),
        },
        unpublishConfig: {
          mutateAsync: vi.fn(),
          isPending: false,
          reset: vi.fn(),
        },
        deleteConfig: {
          mutateAsync: vi.fn(),
          isPending: false,
          reset: vi.fn(),
        },
      } as unknown as ReturnType<typeof useConfigMutations>,
      generate: {
        mutateAsync: vi.fn(),
        isPending: false,
        reset: vi.fn(),
      } as unknown as ReturnType<typeof useGenerateInterviewQuestions>,
      isArchived: false,
      approvedCount: 0,
      publishDisabled: false,
      setJustSaved: vi.fn(),
      setDraft,
      setActiveRunId: vi.fn(),
      setConfirmDelete: vi.fn(),
      onDeleted: vi.fn(),
    });
    return { actions, setDraft, updateMutateAsync };
  }

  it("does NOT call the API and returns false for an empty PATCH", async () => {
    const toastError = vi.spyOn(toast, "error").mockImplementation(() => "");
    const draft: SettingsDraft = {
      ...draftFromConfig(savedConfig()),
      title: "Voice demo ",
    };
    const { actions, updateMutateAsync } = makeActions(draft);

    const ok = await actions.saveSettings();

    expect(ok).toBe(false);
    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(
      "teacher_interview_config.errors.nothing_to_save",
    );
    toastError.mockRestore();
  });

  it("PATCHes a real change and reports success", async () => {
    const { actions, setDraft, updateMutateAsync } = makeActions({
      ...draftFromConfig(savedConfig()),
      title: "Voice demo (renamed)",
    });

    const ok = await actions.saveSettings();

    expect(ok).toBe(true);
    expect(updateMutateAsync).toHaveBeenCalledWith({
      title: "Voice demo (renamed)",
    });
    expect(setDraft).toHaveBeenCalledWith(
      draftFromConfig(savedConfig({ title: "Voice demo (renamed)" })),
    );
  });
});

describe("reconcileDraftWithConfig", () => {
  it("keeps a locally edited field and accepts server changes elsewhere", () => {
    const previous = savedConfig();
    const incoming = savedConfig({ title: "Voice demo (server rename)" });
    const current: SettingsDraft = {
      ...draftFromConfig(previous),
      title: "My local edit",
    };

    const next = reconcileDraftWithConfig(current, previous, incoming);

    expect(next.title).toBe("My local edit");
    expect(next.persona).toBe(incoming.persona ?? "neutral");
    expect(next.max_attempts).toBe(String(incoming.max_attempts));
  });

  it("applies server values to untouched fields", () => {
    const previous = savedConfig();
    const incoming = savedConfig({ title: "Server title", time_limit_minutes: 30 });
    const current = draftFromConfig(previous);

    const next = reconcileDraftWithConfig(current, previous, incoming);

    expect(next.title).toBe("Server title");
    expect(next.time_limit_minutes).toBe("30");
  });

  it("keeps notes and rubric_criteria together when either is edited", () => {
    const previous = savedConfig();
    const incoming = savedConfig({
      supplementary_instructions: JSON.stringify({
        notes: "server notes",
        criteria: [{ key: "depth", weight: 4 }],
      }),
    });
    const current: SettingsDraft = {
      ...draftFromConfig(previous),
      notes: "local notes",
    };

    const next = reconcileDraftWithConfig(current, previous, incoming);

    // Both halves of the pair come from the local draft — never a mix.
    expect(next.notes).toBe("local notes");
    expect(next.rubric_criteria).toBe(current.rubric_criteria);
  });

  it("syncs the whole supplementary pair when neither half is edited", () => {
    const previous = savedConfig({ supplementary_instructions: null });
    const incoming = savedConfig({
      supplementary_instructions: JSON.stringify({ notes: "fresh", criteria: [] }),
    });
    const current = draftFromConfig(previous);

    const next = reconcileDraftWithConfig(current, previous, incoming);

    expect(next.notes).toBe("fresh");
  });
});
