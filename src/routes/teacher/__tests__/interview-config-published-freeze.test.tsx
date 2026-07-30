import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { SettingsForm } from "@/routes/teacher/interview-config";
/**
 * The published freeze, asserted on the real form rather than on the helper.
 *
 * The helper (`published-field-freeze`) decides WHICH fields are frozen and is
 * unit-tested separately. What can still break independently of it is the
 * wiring: a `Field` that forgets to pass `lock(...)`, or one that dims its label
 * while leaving the input typeable — which is worse than not dimming at all,
 * because the teacher only discovers the freeze when the save 409s.
 *
 * So these assert the property that actually protects the teacher: on a
 * published config the frozen controls are genuinely `disabled`, and the
 * student-safe ones are genuinely not.
 */

const DRAFT = {
  title: "Basic Knowledge",
  persona: "neutral" as const,
  tts_voice: "",
  supported_modes: "text" as const,
  time_limit_minutes: "30",
  max_attempts: "2",
  cooldown_hours: "24",
  min_outcomes_to_pass: "2",
  lock_quiz_ef_until_pass: false,
  practice_mode_enabled: false,
  notes: "",
  rubric_criteria: [],
  security_response_policy: "warn" as const,
  security_max_consecutive_attempts: "3",
  security_custom_refusal_en: "",
  security_custom_refusal_vi: "",
  security_incident_summary_enabled: true,
  persona_profile: {},
};

function renderForm(status: string) {
  return render(
    <SettingsForm
      draft={DRAFT as never}
      setDraft={vi.fn()}
      onSubmit={vi.fn()}
      saving={false}
      dirty={false}
      justSaved={false}
      updatedAt={null}
      practiceQuestionCount={0}
      status={status}
    />,
  );
}

/** The control a label points at, resolved through htmlFor. */
function controlFor(labelText: RegExp): HTMLElement {
  const label = screen.getAllByText(labelText)[0].closest("label");
  expect(label, `no <label> for ${labelText}`).not.toBeNull();
  const id = label!.getAttribute("for");
  expect(id, `label ${labelText} has no htmlFor`).toBeTruthy();
  const control = document.getElementById(id!);
  expect(control, `no control with id ${id}`).not.toBeNull();
  return control!;
}

describe("SettingsForm published freeze", () => {
  it("disables the duration input on a published config", () => {
    renderForm("published");
    expect(controlFor(/duration|time limit|thời lượng/i)).toBeDisabled();
  });

  it("leaves the duration input editable on a draft", () => {
    renderForm("draft");
    expect(controlFor(/duration|time limit|thời lượng/i)).not.toBeDisabled();
  });

  it("keeps the title editable even when published", () => {
    renderForm("published");
    // Renaming a live interview is harmless: the title never reaches the run.
    expect(controlFor(/^Tiêu đề$|^Title$/i)).not.toBeDisabled();
  });

  it("keeps attempt limits editable when published", () => {
    renderForm("published");
    // Read before a session exists, so they gate only NEW attempts.
    expect(controlFor(/^Số lần thử$|^Attempts$/i)).not.toBeDisabled();
  });

  it("disables the practice-mode checkbox when published", () => {
    const { container } = renderForm("published");
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(checkbox).toBeDisabled();
  });

  it("leaves the practice-mode checkbox usable on a draft", () => {
    const { container } = renderForm("draft");
    expect(
      container.querySelector('input[type="checkbox"]'),
    ).not.toBeDisabled();
  });

  it("explains the freeze instead of leaving fields mysteriously grey", () => {
    renderForm("published");
    // A dimmed field with no explanation reads as a bug or a permissions issue,
    // and "unpublish first" is not guessable.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows no freeze banner on a draft", () => {
    renderForm("draft");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
