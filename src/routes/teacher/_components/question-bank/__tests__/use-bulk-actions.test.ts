import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import { useBulkActions, type BulkActionsOptions } from "../use-bulk-actions";

/**
 * Bulk "add to bank" prompt bookkeeping (question-bank/use-bulk-actions.ts).
 *
 * The batch dedupes on NORMALISED prompt across the whole selection, not just
 * against what the bank already held: a logical group that lands reserves all
 * four of its prompts so a later standalone row with the same text is skipped
 * rather than duplicated. A group that FAILS must not reserve anything — the
 * standalone row is then the only chance that prompt gets banked at all.
 */

const GROUP_ID = "11111111-1111-1111-1111-111111111111";
const ANGLES = ["technical", "system_design", "situational", "behavioral"] as const;

function question(
  id: string,
  prompt: string,
  questionType: string,
  variantGroupId: string | null = null,
): InterviewQuestionAuthoring {
  return {
    id,
    prompt_text: prompt,
    question_type: questionType,
    variant_group_id: variantGroupId,
    difficulty: null,
    model_answer: null,
  } as unknown as InterviewQuestionAuthoring;
}

function completeGroup(prompts: readonly string[]) {
  return ANGLES.map((angle, index) =>
    question(`g${index}`, prompts[index], angle, GROUP_ID),
  );
}

function setup(
  selectedQuestions: InterviewQuestionAuthoring[],
  overrides: Partial<BulkActionsOptions> = {},
) {
  const addToBank = { mutateAsync: vi.fn().mockResolvedValue(undefined) };
  const addLogicalGroupToBank = { mutateAsync: vi.fn().mockResolvedValue(undefined) };
  const options = {
    configId: "cfg-1",
    selectedQuestions,
    clearSelection: vi.fn(),
    updateQuestion: { mutateAsync: vi.fn() },
    deleteQuestion: { mutateAsync: vi.fn() },
    addToBank,
    addLogicalGroupToBank,
    bankedPrompts: new Set<string>(),
    setDeletingIds: vi.fn(),
    confirmAction: vi.fn().mockResolvedValue(true),
    t: ((key: string) => key) as unknown as BulkActionsOptions["t"],
    ...overrides,
  } as unknown as BulkActionsOptions;
  const { result } = renderHook(() => useBulkActions(options));
  return { result, addToBank, addLogicalGroupToBank };
}

const bankedPrompt = (call: unknown) =>
  (call as { prompt_text: string }).prompt_text;

describe("useBulkActions.bulkAddToBank", () => {
  it("a landed logical group reserves all four prompts against later standalones", async () => {
    const group = completeGroup([
      "Shared prompt?",
      "Group system design?",
      "Group situational?",
      "Group behavioral?",
    ]);
    // Same text as the group's technical angle, differing only by case/space.
    const standalone = question("s1", "  SHARED PROMPT? ", "conceptual");
    const { result, addToBank, addLogicalGroupToBank } = setup([...group, standalone]);

    await result.current.bulkAddToBank();

    expect(addLogicalGroupToBank.mutateAsync).toHaveBeenCalledTimes(1);
    expect(addToBank.mutateAsync).not.toHaveBeenCalled();
  });

  it("a standalone with a prompt no group claimed is still banked", async () => {
    const group = completeGroup([
      "Group technical?",
      "Group system design?",
      "Group situational?",
      "Group behavioral?",
    ]);
    const standalone = question("s1", "Unrelated standalone?", "conceptual");
    const { result, addToBank, addLogicalGroupToBank } = setup([...group, standalone]);

    await result.current.bulkAddToBank();

    expect(addLogicalGroupToBank.mutateAsync).toHaveBeenCalledTimes(1);
    expect(addToBank.mutateAsync).toHaveBeenCalledTimes(1);
    expect(bankedPrompt(addToBank.mutateAsync.mock.calls[0][0])).toBe(
      "Unrelated standalone?",
    );
  });

  it("a FAILED logical group does not reserve its prompts", async () => {
    const group = completeGroup([
      "Shared prompt?",
      "Group system design?",
      "Group situational?",
      "Group behavioral?",
    ]);
    const standalone = question("s1", "Shared prompt?", "conceptual");
    const addLogicalGroupToBank = {
      mutateAsync: vi.fn().mockRejectedValue(new Error("409")),
    };
    const { result, addToBank } = setup([...group, standalone], {
      addLogicalGroupToBank,
    });

    await result.current.bulkAddToBank();

    // The group is gone, so the standalone row is the only path left for this
    // prompt — reserving on failure would have silently dropped it.
    expect(addToBank.mutateAsync).toHaveBeenCalledTimes(1);
    expect(bankedPrompt(addToBank.mutateAsync.mock.calls[0][0])).toBe("Shared prompt?");
  });

  it("a partial group selection is never downgraded into loose bank rows", async () => {
    const partial = completeGroup([
      "Partial technical?",
      "Partial system design?",
      "Partial situational?",
      "Partial behavioral?",
    ]).slice(0, 2);
    const { result, addToBank, addLogicalGroupToBank } = setup(partial);

    await result.current.bulkAddToBank();

    expect(addLogicalGroupToBank.mutateAsync).not.toHaveBeenCalled();
    expect(addToBank.mutateAsync).not.toHaveBeenCalled();
  });

  it("prompts already in the bank are skipped for both shapes", async () => {
    const group = completeGroup([
      "Already banked?",
      "Group system design?",
      "Group situational?",
      "Group behavioral?",
    ]);
    const standalone = question("s1", "Also banked?", "conceptual");
    const { result, addToBank, addLogicalGroupToBank } = setup([...group, standalone], {
      bankedPrompts: new Set(["already banked?", "also banked?"]),
    });

    await result.current.bulkAddToBank();

    expect(addLogicalGroupToBank.mutateAsync).not.toHaveBeenCalled();
    expect(addToBank.mutateAsync).not.toHaveBeenCalled();
  });
});
