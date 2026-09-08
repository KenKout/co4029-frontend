import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useQuizIntegrityReporter } from "@/lib/hooks/useQuizIntegrityReporter";
import { createQueryWrapper } from "@/test/react-query-wrapper";

/**
 * The proctoring contract the store accepts is wider than what the browser
 * used to report: `disconnect` / `reconnect` have been valid event types since
 * the endpoint landed, but nothing on the quiz side produced them, so a gap in
 * a teacher's timeline could equally mean "the network dropped" or "the
 * student stopped answering" — and only one of those is misconduct.
 *
 * The reporter debounces before sending, so every assertion here waits for the
 * batch rather than the enqueue.
 */

const ATTEMPT = "33333333-3333-3333-3333-333333333333";

type Batch = { events: { event_type: string; severity?: string }[] };

const posted: Batch[] = [];

vi.mock("@/lib/api/hooks/quizzes", () => ({
  useReportQuizIntegrityEvents: () => ({
    mutateAsync: (batch: Batch) => {
      posted.push(batch);
      return Promise.resolve({ accepted: batch.events.length });
    },
  }),
}));

/** Drive `document.hidden`, which jsdom exposes as a non-writable property. */
function setHidden(value: boolean) {
  Object.defineProperty(document, "hidden", { value, configurable: true });
}

function renderReporter(attemptId: string | null = ATTEMPT) {
  const { Wrapper } = createQueryWrapper();
  return renderHook(() => useQuizIntegrityReporter(attemptId), {
    wrapper: Wrapper,
  });
}

/** All event types seen across every batch sent so far. */
function sentTypes(): string[] {
  return posted.flatMap((b) => b.events.map((e) => e.event_type));
}

describe("useQuizIntegrityReporter", () => {
  beforeEach(() => {
    posted.length = 0;
    vi.useFakeTimers();
    // Shared jsdom document — reset so a test that hides the tab cannot leak
    // into the next one.
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it("reports connection loss and recovery as a pair", () => {
    renderReporter();

    act(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
      vi.advanceTimersByTime(2000);
    });

    // The pair is what makes the gap explainable: a lone `disconnect` reads
    // as "they left", a disconnect followed by a reconnect reads as a flaky
    // network.
    expect(sentTypes()).toEqual(["disconnect", "reconnect"]);
  });

  it("marks a dropped connection as a warning, not as critical", () => {
    renderReporter();

    act(() => {
      window.dispatchEvent(new Event("offline"));
      vi.advanceTimersByTime(2000);
    });

    expect(posted.length).toBeGreaterThan(0);
    const [event] = posted[0].events;
    // A flaky network is not misconduct.
    expect(event).toMatchObject({
      event_type: "disconnect",
      severity: "warning",
    });
  });

  it("logs one event for a tab switch, not a focus loss beside it", () => {
    renderReporter();

    // A real tab switch dispatches BOTH, and `document.hidden` is not settled
    // until visibilitychange — which is why the blur decision is deferred.
    act(() => {
      window.dispatchEvent(new Event("blur"));
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(2000);
    });

    expect(sentTypes()).toEqual(["tab_switch"]);
  });

  it("logs one event when visibilitychange lands before blur", () => {
    renderReporter();

    // Engines disagree on the order, so the other one must collapse too.
    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("blur"));
      vi.advanceTimersByTime(2000);
    });

    expect(sentTypes()).toEqual(["tab_switch"]);
  });

  it("still reports a focus loss that is not a tab switch", () => {
    renderReporter();

    // Alt-tab to another app: the window blurs, the tab stays visible.
    act(() => {
      window.dispatchEvent(new Event("blur"));
      vi.advanceTimersByTime(2000);
    });

    expect(sentTypes()).toEqual(["focus_lost"]);
  });

  it("keeps repeated blurs as separate signals", () => {
    renderReporter();

    act(() => {
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("blur"));
      vi.advanceTimersByTime(2000);
    });

    // Deferring the decision must not turn two signals into one.
    expect(sentTypes()).toEqual(["focus_lost", "focus_lost"]);
  });

  it("still reports the focus signals it always did", () => {
    renderReporter();

    act(() => {
      window.dispatchEvent(new Event("blur"));
      vi.advanceTimersByTime(2000);
    });

    expect(sentTypes()).toContain("focus_lost");
  });

  it("stays silent with no attempt in progress", () => {
    renderReporter(null);

    act(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("blur"));
      vi.advanceTimersByTime(2000);
    });

    expect(posted).toHaveLength(0);
  });

  it("routes a caller-detected signal through the same batch", () => {
    const { result } = renderReporter();

    // `fullscreen_exit` is not a DOM event this hook listens for: only the
    // fullscreen deterrent can tell an Escape press from the programmatic exit
    // it performs itself when the attempt ends.
    act(() => {
      result.current.record({
        event_type: "fullscreen_exit",
        severity: "warning",
      });
      vi.advanceTimersByTime(2000);
    });

    expect(sentTypes()).toEqual(["fullscreen_exit"]);
  });

  it("detaches its listeners on unmount", () => {
    const { unmount } = renderReporter();
    unmount();
    posted.length = 0;

    act(() => {
      window.dispatchEvent(new Event("offline"));
      vi.advanceTimersByTime(2000);
    });

    expect(posted).toHaveLength(0);
  });
});
