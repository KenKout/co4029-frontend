/**
 * Same-device persistence for per-question "first seen" timestamps of an
 * in-progress quiz attempt.
 *
 * The per-question elapsed badge and the ``t_actual_ms`` we report to the
 * server both derive from *when the student first landed on that question*.
 * That anchor lived only in an in-memory ref (`questionSeenAtRef`), so a
 * refresh (F5), tab close, or crash reset it to "now" and the timer visibly
 * restarted from 00:00/00:01 instead of counting from the real first view.
 *
 * We mirror ``{ questionId: epochMs }`` into localStorage keyed by attempt id
 * so a resumed attempt keeps counting from the original first-seen time.
 * Best-effort: any storage error (quota, private mode, disabled) is swallowed
 * — this is an accuracy enhancement, never a correctness dependency.
 */

const KEY_PREFIX = "abridgeai.quiztiming.";

/** `{ [questionId]: epochMillisWhenFirstSeen }` for one attempt. */
export type QuizSeenAt = Record<string, number>;

function keyFor(attemptId: string): string {
  return `${KEY_PREFIX}${attemptId}`;
}

export function loadSeenAt(attemptId: string): QuizSeenAt {
  try {
    const raw = window.localStorage.getItem(keyFor(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    // Keep only finite positive numbers — guard against corrupted entries.
    const out: QuizSeenAt = {};
    for (const [qid, ts] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
        out[qid] = ts;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveSeenAt(attemptId: string, seenAt: QuizSeenAt): void {
  try {
    window.localStorage.setItem(keyFor(attemptId), JSON.stringify(seenAt));
  } catch {
    // Quota exceeded / storage disabled — timing mirror is best-effort.
  }
}

export function clearSeenAt(attemptId: string): void {
  try {
    window.localStorage.removeItem(keyFor(attemptId));
  } catch {
    // ignore
  }
}
