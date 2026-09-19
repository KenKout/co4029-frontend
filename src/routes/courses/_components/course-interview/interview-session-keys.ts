/**
 * Single source for the sessionStorage key shape shared by the auto-resume
 * reader (use-interview-server-sync) and the intentional-leave clear
 * (use-interview-actions) — the audit's stale-marker fix is only sound while
 * both sides agree on the exact key.
 */
export function interviewActiveMarkerKey(configId: string): string {
  return `abridge:iv-active:${configId}`;
}
