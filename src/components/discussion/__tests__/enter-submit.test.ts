import { describe, expect, it } from "vitest";
import type { KeyboardEvent } from "react";

import { isEnterSubmit } from "../enter-submit";

/** Minimal KeyboardEvent stub — only the fields the helper reads. */
function keyEvent(opts: {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
}): KeyboardEvent<HTMLTextAreaElement> {
  return {
    key: opts.key,
    shiftKey: opts.shiftKey ?? false,
    nativeEvent: { isComposing: opts.isComposing ?? false },
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
}

describe("isEnterSubmit (Enter sends, Shift+Enter newlines)", () => {
  it("submits on bare Enter", () => {
    expect(isEnterSubmit(keyEvent({ key: "Enter" }))).toBe(true);
  });

  it("does NOT submit on Shift+Enter (newline)", () => {
    expect(isEnterSubmit(keyEvent({ key: "Enter", shiftKey: true }))).toBe(
      false,
    );
  });

  it("does NOT submit on any other key", () => {
    expect(isEnterSubmit(keyEvent({ key: "a" }))).toBe(false);
    expect(isEnterSubmit(keyEvent({ key: "Escape" }))).toBe(false);
  });

  it("does NOT submit while an IME composition is in flight", () => {
    // Vietnamese telex/vni: the Enter that commits the candidate list must
    // not post the comment.
    expect(
      isEnterSubmit(keyEvent({ key: "Enter", isComposing: true })),
    ).toBe(false);
    expect(
      isEnterSubmit(keyEvent({ key: "Enter", isComposing: true, shiftKey: true })),
    ).toBe(false);
  });
});
