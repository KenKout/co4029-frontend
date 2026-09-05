import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDraftAutosave } from "../use-draft-autosave";

/**
 * An acked answer is not a stored answer, so its draft must survive the ack.
 *
 * `accepted` on the control topic means the agent received the text. Grading runs
 * after it (seconds of LLM calls) and the transcript row is written on the far
 * side of that, so a worker that dies inside the window loses the answer
 * entirely. Clearing the autosaved draft on the ack took the candidate's only
 * other copy with it: a reload showed an empty composer and no record of an answer
 * they had already written and sent.
 *
 * So the submit path calls `markSubmitted`, which MOVES the draft to a `:sent`
 * slot; `restore` still returns it, and `clear` — called when the server's own
 * state shows the interview moved past that question — is what finally drops it.
 */

const SESSION = "s-1";
const QUESTION = "q-1";
const LIVE_KEY = `abridge:iv-draft:${SESSION}:${QUESTION}`;
const SENT_KEY = `${LIVE_KEY}:sent`;

function mount(draft: string) {
  return renderHook(() => useDraftAutosave(SESSION, QUESTION, draft));
}

describe("a draft outlives an unconfirmed submit", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("parks the draft instead of deleting it on submit", () => {
    window.localStorage.setItem(LIVE_KEY, "my careful answer");
    const { result } = mount("my careful answer");

    result.current.markSubmitted();

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SENT_KEY)).toBe("my careful answer");
  });

  it("restores a sent-but-unconfirmed answer after a reload", () => {
    window.localStorage.setItem(SENT_KEY, "my careful answer");
    const { result } = mount("");

    expect(result.current.restore()).toBe("my careful answer");
  });

  it("prefers a live draft over the sent copy", () => {
    // The candidate started typing again — that text is what they care about.
    window.localStorage.setItem(SENT_KEY, "the sent one");
    window.localStorage.setItem(LIVE_KEY, "what I am typing now");
    const { result } = mount("what I am typing now");

    expect(result.current.restore()).toBe("what I am typing now");
  });

  it("parks text that was submitted before the debounced write landed", () => {
    // Typed and sent inside the 400ms autosave debounce: storage is still empty,
    // so taking the draft only from storage would park nothing at all.
    const { result } = mount("typed and sent fast");

    result.current.markSubmitted();

    expect(window.localStorage.getItem(SENT_KEY)).toBe("typed and sent fast");
  });

  it("drops both copies once the answer is confirmed", () => {
    window.localStorage.setItem(LIVE_KEY, "live");
    window.localStorage.setItem(SENT_KEY, "sent");
    const { result } = mount("live");

    result.current.clear();

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SENT_KEY)).toBeNull();
    expect(result.current.restore()).toBeNull();
  });

  it("keeps each question's copies separate", () => {
    window.localStorage.setItem(
      `abridge:iv-draft:${SESSION}:q-other:sent`,
      "another question's answer",
    );
    const { result } = mount("");

    expect(result.current.restore()).toBeNull();
  });

  it("treats a whitespace-only submit as nothing to park", () => {
    const { result } = mount("   ");

    result.current.markSubmitted();

    expect(window.localStorage.getItem(SENT_KEY)).toBeNull();
  });
});
