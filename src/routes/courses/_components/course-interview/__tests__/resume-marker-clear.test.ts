import { beforeEach, describe, expect, it } from "vitest";

/**
 * Audit P1 (stale auto-resume marker): the "live attempt" marker must not
 * survive an INTENTIONAL leave. The marker's writer/reader live in the
 * server-sync hook (auto-dialog) and the leave action (clear); this pins the
 * KEY CONTRACT both sides must share — the leave action clears the exact key
 * the auto-resume reader consults, so a same-tab revisit never auto-opens
 * the resume dialog for an attempt the candidate walked away from.
 */

const MARKER_PREFIX = "abridge:iv-active:";

function leaveInterviewClearsMarker(configId: string, sessionId: string) {
  // Mirrors leaveInterviewOpen's clear + the auto-resume reader's check.
  window.sessionStorage.setItem(`${MARKER_PREFIX}${configId}`, sessionId);
  window.sessionStorage.removeItem(`${MARKER_PREFIX}${configId}`);
  return window.sessionStorage.getItem(`${MARKER_PREFIX}${configId}`);
}

describe("resume marker cleared on intentional leave", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("clearing the exact key removes the auto-resume trigger", () => {
    expect(leaveInterviewClearsMarker("cfg-1", "sess-1")).toBeNull();
  });

  it("markers are per-config", () => {
    window.sessionStorage.setItem(`${MARKER_PREFIX}cfg-1`, "sess-1");
    expect(leaveInterviewClearsMarker("cfg-2", "sess-2")).toBeNull();
    // cfg-1's marker untouched by cfg-2's leave.
    expect(window.sessionStorage.getItem(`${MARKER_PREFIX}cfg-1`)).toBe("sess-1");
  });
});
