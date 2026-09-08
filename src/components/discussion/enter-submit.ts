import type { KeyboardEvent } from "react";

/**
 * Enter sends, Shift+Enter makes a newline — the composer convention.
 *
 * Returns true when the caller should submit. The caller owns the submit so
 * each surface keeps its own disabled/pending guards.
 *
 * IME guard: while a composition is in flight (Vietnamese telex/vni, CJK),
 * the "Enter" that confirms the candidate list MUST NOT send — keydown fires
 * with key === "Enter" and keyCode 229 during composition. Without this,
 * confirming an IME candidate posts the comment mid-word.
 */
export function isEnterSubmit(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing;
}
