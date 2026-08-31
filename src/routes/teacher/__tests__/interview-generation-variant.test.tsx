/**
 * Phase 6 — variant_strategy on the interview Generate tab.
 *
 * Pins the pieces Slice 21 depends on:
 * - the default generation form carries ``variant_strategy: ""`` (legacy mix);
 * - the Select trigger resolves the translated label for every strategy
 *   (options live in a portalled popup, so the closed trigger is what the
 *   teacher sees per selection);
 * - in all_angles mode the count field relabels to "per role" and shows the
 *   live expansion math (N × 4 angles = total), matching the backend's
 *   multiplication in pipelines/variant.py.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import i18n from "@/i18n";
import type { GenerationFormState } from "@/lib/interview/config-draft";
import { maxLogicalQuestionCount } from "@/lib/interview/config-draft";
import { GenerationModeFields } from "@/routes/teacher/_components/interview-config/generation-form-fields";

function form(
  overrides: Partial<GenerationFormState> = {},
): GenerationFormState {
  return {
    question_count: 5,
    variant_strategy: "",
    focus_topics: "",
    avoid_topics: "",
    source_module_ids: [],
    target_outcome_ids: [],
    ...overrides,
  };
}

function noopUpdate() {
  /* updateGeneration is not exercised here */
}

/** The component renders translated labels — resolve the same keys. */
const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(`teacher_interview_config.generate.${key}`, opts);

describe("variant_strategy form field", () => {
  it("resolves a distinct trigger label for every strategy", () => {
    const cases = [
      { value: "" as const, key: "variant_mixed" },
      { value: "all_angles" as const, key: "variant_all_angles" },
      { value: "role_only" as const, key: "variant_role_only" },
    ];
    for (const { value, key } of cases) {
      const { unmount } = render(
        <GenerationModeFields
          generationForm={form({ variant_strategy: value })}
          updateGeneration={noopUpdate}
          interviewerRole="backend_tech_lead"
        />,
      );
      expect(screen.getByText(t(key))).toBeInTheDocument();
      unmount();
    }
  });

  it("keeps the plain count label and hides the expansion note outside all_angles", () => {
    for (const variant_strategy of ["", "role_only"] as const) {
      const { unmount } = render(
        <GenerationModeFields
          generationForm={form({ variant_strategy })}
          updateGeneration={noopUpdate}
          interviewerRole="backend_tech_lead"
        />,
      );
      expect(screen.getByText(t("count_label"))).toBeInTheDocument();
      expect(
        screen.queryByText(t("variant_expansion_note", { count: 5, effective: 20 })),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it("relabels the count to per-role and bolds the N x 4 expansion total", () => {
    render(
      <GenerationModeFields
        generationForm={form({ variant_strategy: "all_angles", question_count: 5 })}
        updateGeneration={noopUpdate}
        interviewerRole="backend_tech_lead"
      />,
    );
    expect(screen.getByText(t("count_label_per_role"))).toBeInTheDocument();
    // The computed total renders inside a <strong> so the teacher's eye lands
    // on "20" — the actual size of the bank they are about to create.
    const strong = screen.getByText("20").closest("strong");
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent("20");
  });

  it("caps the count at 12 in all_angles and warns above it", () => {
    // all_angles produces 4 rows per logical question, so 12 x 4 = 48 fits the
    // backend's 50-row budget; 13 would be 52 and 400s at enqueue.
    const { unmount } = render(
      <GenerationModeFields
        generationForm={form({ variant_strategy: "all_angles", question_count: 12 })}
        updateGeneration={noopUpdate}
        interviewerRole="backend_tech_lead"
      />,
    );
    expect(screen.getByRole("spinbutton")).toHaveAttribute("max", "12");
    expect(screen.queryByRole("alert")).toBeNull();
    unmount();

    render(
      <GenerationModeFields
        generationForm={form({ variant_strategy: "all_angles", question_count: 13 })}
        updateGeneration={noopUpdate}
        interviewerRole="backend_tech_lead"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("12");
    // The expansion note is replaced by the error, not shown beside it.
    expect(
      screen.queryByText(t("variant_expansion_note", { count: 13, effective: 52 })),
    ).not.toBeInTheDocument();
  });

  it("keeps the full 50 for non-multiplying strategies", () => {
    for (const variant_strategy of ["", "role_only"] as const) {
      const { unmount } = render(
        <GenerationModeFields
          generationForm={form({ variant_strategy, question_count: 50 })}
          updateGeneration={noopUpdate}
          interviewerRole="backend_tech_lead"
        />,
      );
      expect(screen.getByRole("spinbutton")).toHaveAttribute("max", "50");
      expect(screen.queryByRole("alert")).toBeNull();
      unmount();
    }
  });
});

describe("maxLogicalQuestionCount", () => {
  it("mirrors the backend cap per strategy", () => {
    expect(maxLogicalQuestionCount("all_angles")).toBe(12);
    expect(maxLogicalQuestionCount("role_only")).toBe(50);
    expect(maxLogicalQuestionCount("")).toBe(50);
  });
});

describe("role_only availability follows the interviewer role", () => {
  it("warns when role_only is picked but the role has no question type", () => {
    // generic_assistant is the DEFAULT role and maps to null in
    // INTERVIEWER_ROLE_PREFERRED_TYPE, so "match the role" has nothing to
    // match — the backend refuses it instead of quietly producing a mixed bank.
    render(
      <GenerationModeFields
        generationForm={form({ variant_strategy: "role_only" })}
        updateGeneration={noopUpdate}
        interviewerRole="generic_assistant"
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe(
      i18n.t("teacher_interview_config.errors.role_only_needs_a_role"),
    );
  });

  it("stays silent for a role that does have a question type", () => {
    render(
      <GenerationModeFields
        generationForm={form({ variant_strategy: "role_only" })}
        updateGeneration={noopUpdate}
        interviewerRole="backend_tech_lead"
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not warn for other strategies on a typeless role", () => {
    // all_angles covers every angle regardless of role, so generic is fine.
    for (const variant_strategy of ["", "all_angles"] as const) {
      const { unmount } = render(
        <GenerationModeFields
          generationForm={form({ variant_strategy })}
          updateGeneration={noopUpdate}
          interviewerRole="generic_assistant"
        />,
      );
      expect(screen.queryByRole("alert")).toBeNull();
      unmount();
    }
  });
});
