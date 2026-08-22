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
import { GenerationModeFields } from "@/routes/teacher/_components/interview-config/generation-form-fields";

function form(
  overrides: Partial<GenerationFormState> = {},
): GenerationFormState {
  return {
    mode: "outcome-based",
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
        />,
      );
      expect(screen.getByText(t("count_label"))).toBeInTheDocument();
      expect(
        screen.queryByText(t("variant_expansion_note", { count: 5, effective: 20 })),
      ).not.toBeInTheDocument();
      unmount();
    }
  });

  it("relabels the count to per-role and shows the N x 4 expansion note", () => {
    render(
      <GenerationModeFields
        generationForm={form({ variant_strategy: "all_angles", question_count: 5 })}
        updateGeneration={noopUpdate}
      />,
    );
    expect(screen.getByText(t("count_label_per_role"))).toBeInTheDocument();
    expect(
      screen.getByText(t("variant_expansion_note", { count: 5, effective: 20 })),
    ).toBeInTheDocument();
  });
});
