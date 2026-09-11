import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDraftAutosave } from "../use-draft-autosave";

/**
 * An acked answer is not a stored answer, so its draft must survive the ack.
 *
 * `accepted` on the control topic means the agent received the text — and under
 * the durable-receipt protocol, that the answer's transcript row COMMITTED. But
 * the fold (grading) runs after it, and a fold that was graded twice is exactly
 * the bug the turn_key protocol exists to stop — so the client must not treat
 * the ack as "settled, drop everything". It parks the exact sent payload, and
 * only a server snapshot whose `confirmed_turn_key` MATCHES that key may clear
 * the copy.
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

  it("parks the SENT PAYLOAD as versioned JSON, not the storage snapshot", () => {
    // The payload that was actually sent wins: the debounced mirror may hold a
    // stale mid-typing text, and the copy worth restoring is what the server
    // received.
    window.localStorage.setItem(LIVE_KEY, "stale mirror text");
    const { result } = mount("the real sent text");

    result.current.markSubmitted({ text: "the real sent text", turnKey: "tk-1" });

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    const parked = window.localStorage.getItem(SENT_KEY);
    expect(parked).not.toBeNull();
    expect(JSON.parse(parked ?? "{}")).toEqual({
      v: 1,
      text: "the real sent text",
      turnKey: "tk-1",
    });
  });

  it("restores a sent-but-unconfirmed answer after a reload", () => {
    window.localStorage.setItem(
      SENT_KEY,
      JSON.stringify({ v: 1, text: "my careful answer", turnKey: "tk-2" }),
    );
    const { result } = mount("");

    const restored = result.current.restore();
    expect(restored?.text).toBe("my careful answer");
    // Structured restore: a VERSIONED sent record owns its turn key — this is
    // what seeds the retry identity — and is marked as `sent`, not live.
    expect(restored?.source).toBe("sent");
    expect(restored?.turnKey).toBe("tk-2");
    expect(restored?.legacy).toBe(false);
  });

  it("restores a LEGACY plain-string sent draft", () => {
    // Drafts parked by the pre-protocol build were plain strings; an upgrade
    // must not lose them. A legacy copy can never be confirmed, so its
    // structured restore has NO turn key (fresh key on the next submit).
    window.localStorage.setItem(SENT_KEY, "old parked answer");
    const { result } = mount("");

    const restored = result.current.restore();
    expect(restored?.text).toBe("old parked answer");
    expect(restored?.source).toBe("sent");
    expect(restored?.turnKey).toBeNull();
    expect(restored?.legacy).toBe(true);
  });

  it("prefers a live draft over the sent copy", () => {
    // The candidate started typing again — that text is what they care about.
    // A live restore NEVER seeds retry identity (turnKey null): the next
    // submit is a fresh turn.
    window.localStorage.setItem(SENT_KEY, "the sent one");
    window.localStorage.setItem(LIVE_KEY, "what I am typing now");
    const { result } = mount("what I am typing now");

    const restored = result.current.restore();
    expect(restored?.text).toBe("what I am typing now");
    expect(restored?.source).toBe("live");
    expect(restored?.turnKey).toBeNull();
  });

  it("parks text that was submitted before the debounced write landed", () => {
    // Typed and sent inside the 400ms autosave debounce: storage is still empty,
    // so taking the text only from storage would park nothing at all.
    const { result } = mount("typed and sent fast");

    result.current.markSubmitted({ text: "typed and sent fast", turnKey: "tk-3" });

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "{}").text).toBe(
      "typed and sent fast",
    );
  });

  it("a pending debounce cannot resurrect the live key after submit", () => {
    vi.useFakeTimers();
    const { result } = mount("about to send");

    // The debounced autosave write is scheduled (400ms). Submit BEFORE it runs.
    result.current.markSubmitted({ text: "about to send", turnKey: "tk-4" });
    vi.advanceTimersByTime(500);

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(SENT_KEY) ?? "{}").turnKey).toBe(
      "tk-4",
    );
  });

  it("drops both copies when the confirmation MATCHES the sent key", () => {
    const { result } = mount("");
    result.current.markSubmitted({ text: "sent text", turnKey: "tk-5" });

    result.current.clearIfConfirmed({ turnKey: "tk-5" });

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SENT_KEY)).toBeNull();
    expect(result.current.restore()).toBeNull();
  });

  it("keeps the copy when the confirmation names a DIFFERENT turn", () => {
    // The snapshot confirmed the NEXT question's answer (or an earlier probe):
    // it says nothing about THIS draft's durability. Clearing on it is the
    // inference the durable-receipt protocol exists to stop.
    const { result } = mount("");
    result.current.markSubmitted({ text: "still unconfirmed", turnKey: "tk-6" });

    result.current.clearIfConfirmed({ turnKey: "tk-other" });

    expect(result.current.restore()?.text).toBe("still unconfirmed");
  });

  it("keeps the copy when the snapshot carries NO confirmation", () => {
    // A routine snapshot from an agent predating the confirmation field.
    const { result } = mount("");
    result.current.markSubmitted({ text: "unconfirmed", turnKey: "tk-7" });

    result.current.clearIfConfirmed({ turnKey: null });

    expect(result.current.restore()?.text).toBe("unconfirmed");
  });

  it("a confirmation settles the sent copy but keeps a NEW live follow-up draft", () => {
    // Answer A was acked and parked; the candidate already typed a follow-up B
    // (a new live draft). The confirmation of A must remove A's insurance copy
    // WITHOUT destroying B.
    window.localStorage.setItem(LIVE_KEY, "follow-up draft B");
    window.localStorage.setItem(
      SENT_KEY,
      JSON.stringify({ v: 1, text: "answer A", turnKey: "tk-a" }),
    );
    const { result } = mount("follow-up draft B");

    result.current.clearMatchingSent({ turnKey: "tk-a" });

    expect(window.localStorage.getItem(SENT_KEY)).toBeNull();
    expect(window.localStorage.getItem(LIVE_KEY)).toBe("follow-up draft B");
    expect(result.current.restore()?.text).toBe("follow-up draft B");
  });

  it("clearMatchingSent removes a legacy parked copy but still keeps the live draft", () => {
    window.localStorage.setItem(LIVE_KEY, "typing now");
    window.localStorage.setItem(SENT_KEY, "legacy parked");
    const { result } = mount("typing now");

    // Legacy copies carry no key; the confirmation's own key is irrelevant —
    // the un-confirmable copy goes, the live draft stays.
    result.current.clearMatchingSent({ turnKey: "tk-whatever" });

    expect(window.localStorage.getItem(SENT_KEY)).toBeNull();
    expect(window.localStorage.getItem(LIVE_KEY)).toBe("typing now");
  });

  it("clearLive cancels the debounce and removes ONLY the live key", () => {
    vi.useFakeTimers();
    const { result } = mount("live text");

    result.current.clearLive();
    vi.advanceTimersByTime(500);

    expect(window.localStorage.getItem(LIVE_KEY)).toBeNull();
    // The parked sent record is insurance — untouched by a live-only clear.
    window.localStorage.setItem(SENT_KEY, "kept");
    result.current.clearLive();
    expect(window.localStorage.getItem(SENT_KEY)).toBe("kept");
  });

  it("drops both copies unconditionally on clear()", () => {
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

    result.current.markSubmitted({ text: "   ", turnKey: "tk-8" });

    expect(window.localStorage.getItem(SENT_KEY)).toBeNull();
  });
});
