import { describe, expect, it } from "vitest";

import {
  CANCEL_END_REPLY,
  CONFIRM_END_REPLY,
  endConfirmationPrompt,
  isAwaitingEndConfirmation,
} from "../end-confirmation";

const FALLBACK = "Would you like to end and submit, or continue?";

describe("isAwaitingEndConfirmation", () => {
  it("is true when the backend flags pending_confirmation", () => {
    expect(isAwaitingEndConfirmation({ pending_confirmation: true })).toBe(true);
  });

  it("is false when not pending (normal advance/probe turn)", () => {
    expect(isAwaitingEndConfirmation({ pending_confirmation: false })).toBe(false);
    expect(isAwaitingEndConfirmation({})).toBe(false);
    expect(isAwaitingEndConfirmation({ pending_confirmation: null })).toBe(false);
  });
});

describe("endConfirmationPrompt", () => {
  it("prefers the server ai_turn_text", () => {
    expect(
      endConfirmationPrompt(
        { pending_confirmation: true, ai_turn_text: "End and submit, or continue?" },
        FALLBACK,
      ),
    ).toBe("End and submit, or continue?");
  });

  it("falls back to ai_followup_text then the localized fallback", () => {
    expect(
      endConfirmationPrompt(
        { pending_confirmation: true, ai_followup_text: "Confirm end?" },
        FALLBACK,
      ),
    ).toBe("Confirm end?");
    expect(endConfirmationPrompt({ pending_confirmation: true }, FALLBACK)).toBe(FALLBACK);
  });

  it("trims whitespace and uses the fallback for blank server text", () => {
    expect(
      endConfirmationPrompt({ pending_confirmation: true, ai_turn_text: "   " }, FALLBACK),
    ).toBe(FALLBACK);
  });
});

describe("canned confirm/cancel replies", () => {
  it("are lowercase ASCII phrases the backend classifier recognises", () => {
    // These must stay in sync with the server-side confirmation-scoped
    // patterns in intent.classify_confirmation_reply.
    expect(CONFIRM_END_REPLY).toBe("yes, end the interview");
    expect(CANCEL_END_REPLY).toBe("no, continue the interview");
    expect(CONFIRM_END_REPLY).toBe(CONFIRM_END_REPLY.toLowerCase());
    expect(CANCEL_END_REPLY).toBe(CANCEL_END_REPLY.toLowerCase());
  });
});
