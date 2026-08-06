import { describe, expect, it } from "vitest";

import { isInterviewActive } from "../helpers";

/**
 * Integrity monitoring must stop when the assessment stops.
 *
 * `useIntegrityReporter` used to be gated on `sessionId` alone, but the session
 * id outlives the interview — it is still set on the results screen. So the
 * tab-switch / fullscreen-exit listeners stayed attached while the candidate
 * read their verdict and study plan, firing a "this is logged" toast and
 * POSTing integrity events for behaviour that is not merely allowed at that
 * point but actively encouraged (the study plan links to course PDFs).
 *
 * The gate is now `isInterviewActive`, which these tests pin from the
 * monitoring angle: the predicate already existed for the fullscreen
 * deterrent, so what matters is that it really is false on the results screen
 * and still true for every live phase.
 */

const LIVE_PHASES = [
  "opening",
  "readiness",
  "transition",
  "questioning",
  "closing",
] as const;

describe("integrity monitoring window", () => {
  it.each(LIVE_PHASES)("monitors during the %s phase", (phase) => {
    expect(
      isInterviewActive({
        sessionId: "s-1",
        hasFinishResult: false,
        phase,
      }),
    ).toBe(true);
  });

  it("stops monitoring once the result has landed", () => {
    // THE fix: the results screen keeps sessionId, so this is the only signal
    // that distinguishes "reading my verdict" from "sitting the interview".
    expect(
      isInterviewActive({
        sessionId: "s-1",
        hasFinishResult: true,
        phase: "questioning",
      }),
    ).toBe(false);
  });

  it.each(LIVE_PHASES)(
    "stops monitoring in %s once finished, whatever the phase says",
    (phase) => {
      // Defensive: the phase can lag behind the finish result arriving.
      expect(
        isInterviewActive({ sessionId: "s-1", hasFinishResult: true, phase }),
      ).toBe(false);
    },
  );

  it("does not monitor the prestart screen", () => {
    expect(
      isInterviewActive({
        sessionId: null,
        hasFinishResult: false,
        phase: "questioning",
      }),
    ).toBe(false);
  });

  it("does not monitor the results phase itself", () => {
    expect(
      isInterviewActive({
        sessionId: "s-1",
        hasFinishResult: false,
        phase: "results",
      }),
    ).toBe(false);
  });
});
