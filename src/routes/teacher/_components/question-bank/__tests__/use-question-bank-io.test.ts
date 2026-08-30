import { describe, expect, it } from "vitest";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { buildImportPickerUnits } from "../use-question-bank-io";

/**
 * Import-picker unit building (question-bank/use-question-bank-io.ts).
 *
 * The picker never shows raw bank rows: a complete 4-angle logical group is
 * ONE selectable unit (frame + 4 tabs, "Select all 4"), anything partial
 * degrades to plain items, and a unit whose ANY member already exists in the
 * destination config is hidden wholesale — the server import is atomic, so a
 * half-visible collision would just fail the whole request.
 */

const GROUP_ID = "11111111-1111-1111-1111-111111111111";

function bankItem(
  id: string,
  prompt: string,
  questionType: string,
  variantGroupId: string | null = null,
): InterviewQuestionBankItemRead {
  return {
    id,
    prompt_text: prompt,
    question_type: questionType,
    variant_group_id: variantGroupId,
    endPoint: undefined,
  } as unknown as InterviewQuestionBankItemRead;
}

const NONE: Set<string> = new Set();

describe("buildImportPickerUnits", () => {
  it("renders a complete 4-angle group as ONE logical unit in canonical order", () => {
    // Shuffled on purpose: content order, not bank order, must win.
    const group = [
      bankItem("b", "Behavioral?", "behavioral", GROUP_ID),
      bankItem("t", "Technical?", "technical", GROUP_ID),
      bankItem("s", "System design?", "system_design", GROUP_ID),
      bankItem("a", "Situational?", "situational", GROUP_ID),
    ];
    const units = buildImportPickerUnits(group, NONE);
    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe("logical");
    expect(units[0].items.map((item) => item.question_type)).toEqual([
      "technical",
      "system_design",
      "situational",
      "behavioral",
    ]);
  });

  it("hides a whole group when ONE member already exists in the config", () => {
    const group = [
      bankItem("t", "Technical?", "technical", GROUP_ID),
      bankItem("s", "System design?", "system_design", GROUP_ID),
      bankItem("a", "Situational?", "situational", GROUP_ID),
      bankItem("b", "Behavioral?", "behavioral", GROUP_ID),
    ];
    const existing = new Set(["system design?"]);
    expect(buildImportPickerUnits(group, existing)).toHaveLength(0);
  });

  it("renders a partial group angle-by-angle as plain items", () => {
    const partial = [
      bankItem("t", "Technical?", "technical", GROUP_ID),
      bankItem("s", "System design?", "system_design", GROUP_ID),
    ];
    const units = buildImportPickerUnits(partial, NONE);
    expect(units).toHaveLength(2);
    expect(units.every((unit) => unit.kind === "item")).toBe(true);
    expect(units.map((unit) => unit.items[0].question_type)).toEqual([
      "technical",
      "system_design",
    ]);
  });

  it("keeps NULL-variant_group_id items standalone", () => {
    const singles = [
      bankItem("a", "Old single?", "technical"),
      bankItem("b", "Another old?", "behavioral"),
    ];
    const units = buildImportPickerUnits(singles, NONE);
    expect(units).toHaveLength(2);
    expect(units.every((unit) => unit.kind === "item")).toBe(true);
  });

  it("hides a standalone item whose prompt already exists in the config", () => {
    const singles = [bankItem("a", "Already there?", "technical")];
    expect(
      buildImportPickerUnits(singles, new Set(["already there?"])),
    ).toHaveLength(0);
  });
});
