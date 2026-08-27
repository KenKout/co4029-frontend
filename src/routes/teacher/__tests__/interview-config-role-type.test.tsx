import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { InterviewQuestionAuthoring, InterviewQuestionType } from "@/lib/api/types";
import {
  INTERVIEWER_ROLE_PREFERRED_TYPE,
  preferredQuestionTypeForRole,
  type InterviewerRole,
  type SettingsDraft,
} from "@/lib/interview/config-draft";
import { SettingsBasicsCard } from "@/routes/teacher/_components/interview-config/settings-basics-card";

/**
 * Role → question-type contract for the Settings tab:
 *
 * - Each interviewer role option carries the question TYPE it will ask
 *   ("Backend tech lead - Technical"), mirroring the backend 1:1 map in
 *   `orchestrator/role_question_filter.py` — the FE labels and the coverage
 *   warning must never drift from the engine that actually filters.
 * - Selecting a role whose preferred type has no questions in the bank raises
 *   an amber warning (the engine degrades to other types via fallback, so the
 *   teacher should know the role cannot actually fulfil its type).
 */

const BASE_DRAFT = {
  title: "Technical Insight",
  persona: "supportive" as const,
  tts_voice: "aura-2-hyperion-en",
  time_limit_minutes: "",
  max_attempts: "",
  cooldown_hours: "",
  min_outcomes_to_pass: "2",
  max_follow_ups_per_question: "2",
  max_hints_per_question: "3",
  notes: "",
  rubric_criteria: [],
  security_response_policy: "warn_and_continue" as const,
  security_max_consecutive_attempts: "3",
  security_custom_refusal_en: "",
  security_custom_refusal_vi: "",
  security_incident_summary_enabled: true,
};

function question(type: InterviewQuestionType): InterviewQuestionAuthoring {
  return {
    id: `q-${type}`,
    prompt_text: `Question ${type}`,
    question_type: type,
    review_status: "approved",
    position: 1,
  } as InterviewQuestionAuthoring;
}

function renderCard(
  role: InterviewerRole | undefined,
  questions: InterviewQuestionAuthoring[],
) {
  const draft: SettingsDraft = {
    ...BASE_DRAFT,
    persona_profile: role ? { interviewer_role: role } : {},
  };
  render(
    <SettingsBasicsCard
      draft={draft}
      update={vi.fn()}
      lock={() => ({ frozen: false, frozenReason: "" })}
      status="draft"
      questions={questions}
    />,
  );
}

/** The amber coverage warning for the currently selected role. */
function warningText(): string | null {
  return screen.queryByRole("alert")?.textContent ?? null;
}

describe("preferredQuestionTypeForRole", () => {
  it("maps every role exactly like the backend role_question_filter", () => {
    expect(INTERVIEWER_ROLE_PREFERRED_TYPE).toEqual({
      generic_assistant: null,
      backend_tech_lead: "technical",
      staff_engineer: "system_design",
      eng_manager: "situational",
      hr_screener: "behavioral",
    });
  });

  it("returns null for every unhandled role", () => {
    expect(preferredQuestionTypeForRole("generic_assistant")).toBeNull();
  });
});

describe("interviewer role option / coverage warning", () => {
  it("composes the option label with the question type", () => {
    renderCard("backend_tech_lead", []);
    // The Select trigger renders the composed label of the selected option.
    expect(screen.getByText("Tech lead backend - Kỹ thuật")).toBeInTheDocument();
  });

  it("warns when the bank has no question of the role's type", () => {
    renderCard("backend_tech_lead", [question("behavioral")]);
    expect(warningText()).toContain("Kho câu hỏi không có câu hỏi Kỹ thuật");
  });

  it("does not warn when the bank contains the role's type", () => {
    renderCard("backend_tech_lead", [question("technical"), question("behavioral")]);
    expect(warningText()).toBeNull();
  });

  it("never warns for the generic assistant (no preferred type)", () => {
    renderCard("generic_assistant", []);
    expect(warningText()).toBeNull();
  });

  it("warns for each role whose type is absent from the bank", () => {
    renderCard("hr_screener", [question("technical")]);
    expect(warningText()).toContain("Hành vi");
  });
});