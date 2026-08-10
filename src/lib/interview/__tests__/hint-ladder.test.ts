import { describe, expect, it } from "vitest";

import {
  MAX_HINTS_PER_QUESTION,
  hintLadderExhausted,
  hintsRemaining,
} from "@/lib/interview/hint-ladder";

/**
 * The ladder's depth is duplicated from the backend
 * (`MAX_CANNOT_ANSWER_HINTS` in orchestrator/decision.py) because no snapshot
 * field carries it. These tests pin the contract the UI relies on: the control
 * stays live for every rung and closes exactly at the cap.
 */
describe("hint ladder", () => {
  it("mirrors the backend cap of 3 hints per question", () => {
    expect(MAX_HINTS_PER_QUESTION).toBe(3);
  });

  it("keeps the control live for every rung, and only closes at the cap", () => {
    // The regression this guards: a boolean `hintUsed` disabled the button after
    // the first hint, so rungs 2 and 3 were unreachable through the UI even
    // though the server would have granted them.
    expect(hintLadderExhausted(0)).toBe(false);
    expect(hintLadderExhausted(1)).toBe(false);
    expect(hintLadderExhausted(2)).toBe(false);
    expect(hintLadderExhausted(MAX_HINTS_PER_QUESTION)).toBe(true);
  });

  it("counts down the hints left", () => {
    expect(hintsRemaining(0)).toBe(3);
    expect(hintsRemaining(1)).toBe(2);
    expect(hintsRemaining(2)).toBe(1);
    expect(hintsRemaining(3)).toBe(0);
  });

  it("never reports a negative remainder past the cap", () => {
    // Defensive: a resumed session could replay more hint turns than the current
    // cap allows (the cap was raised from 2), and "-1 left" must never render.
    expect(hintsRemaining(MAX_HINTS_PER_QUESTION + 2)).toBe(0);
    expect(hintLadderExhausted(MAX_HINTS_PER_QUESTION + 2)).toBe(true);
  });
});
