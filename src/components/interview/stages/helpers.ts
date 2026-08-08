import { formatRelativeInterviewTime } from "@/lib/interview/format";
import type { ConversationTurn } from "@/lib/interview/types";
import type { InterviewHeaderProps } from "./types";

/** Committed AI kinds the LIVE agent voices in its own words. */
const AGENT_VOICED_KINDS: ReadonlySet<string> = new Set([
  "question",
  "followup",
  "clarification",
  "hint",
]);

/**
 * The conversation beats the stage shows above the active card, in time order.
 *
 * `liveTurns` is what the interviewer actually SAID (transcription), and that is
 * the preferred record: the agent paraphrases the bank question and adds its own
 * bridge ("Thanks for breaking that down. Now, imagine a company…"), which reads
 * better than the stored wording and is the only trace of the bridge.
 *
 * So exactly ONE record survives per interviewer utterance:
 *
 * * The agent read a question back near-verbatim → its live copy is dropped and
 *   the COMMITTED turn stays, because the two are the same sentence.
 * * The agent reworded it → the committed turn is dropped and the live wording
 *   stays.
 *
 * Restored turns are always kept: they were spoken before this page session, so
 * no transcription of them exists to stand in for them.
 *
 * The active turn and its assistance turn are excluded by id — the card and the
 * assistance panel render those.
 */
export function stageHistoryTurns(
  transcript: readonly ConversationTurn[],
  activeTurn: ConversationTurn | null,
  assistanceTurn: ConversationTurn | null,
  options: {
    liveTurns?: readonly ConversationTurn[];
    agentSpeaks?: boolean;
  } = {},
): ConversationTurn[] {
  const { liveTurns = [], agentSpeaks = false } = options;
  const owned = new Set(
    [activeTurn?.id, assistanceTurn?.id].filter(
      (id): id is string => id !== undefined,
    ),
  );
  const { readBack, spokenAgain } = pairSpokenWithCommitted(
    transcript,
    liveTurns,
  );
  const committed = transcript.filter((turn) => {
    if (owned.has(turn.id)) return false;
    if (!agentSpeaks || turn.role !== "ai") return true;
    // Spoken before this page session, so there is no transcription of it to
    // stand in for it. Dropping these left a resumed interview showing every
    // candidate answer and not one interviewer turn — "F5 and there's no history".
    if (turn.restored) return true;
    // Its live copy is being dropped as a duplicate, so this is the only record.
    if (readBack.has(turn.id)) return true;
    return !AGENT_VOICED_KINDS.has(turn.kind ?? "");
  });
  const kept = [...committed, ...liveTurns.filter((t) => !spokenAgain.has(t.id))];
  const ordered = kept.sort(
    (first, second) =>
      (first.elapsedSeconds ?? 0) - (second.elapsedSeconds ?? 0),
  );
  return labelLiveAgentTurns(ordered, questionAnchors(transcript, activeTurn));
}

/** Punctuation-insensitive, case-insensitive form for comparing what the agent
 * SAID against what was stored. Unicode-aware so Vietnamese survives. */
function normalizeSpoken(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match each committed interviewer turn against the live transcription.
 *
 * Containment either way, not equality: a verbatim reading may carry a short
 * lead-in, so the stored text sits INSIDE the utterance. A genuine paraphrase
 * fails this on purpose — it is a different sentence and deserves its own line.
 */
function pairSpokenWithCommitted(
  transcript: readonly ConversationTurn[],
  liveTurns: readonly ConversationTurn[],
): { readBack: Set<string>; spokenAgain: Set<string> } {
  const readBack = new Set<string>();
  const spokenAgain = new Set<string>();
  const spoken = liveTurns
    .filter((turn) => turn.role === "ai" && turn.text.trim().length > 0)
    .map((turn) => ({ id: turn.id, text: normalizeSpoken(turn.text) }));
  for (const committed of transcript) {
    if (committed.role !== "ai") continue;
    const stored = normalizeSpoken(committed.text);
    if (!stored) continue;
    for (const said of spoken) {
      if (said.text.includes(stored) || stored.includes(said.text)) {
        readBack.add(committed.id);
        spokenAgain.add(said.id);
      }
    }
  }
  return { readBack, spokenAgain };
}

/**
 * When each question became the live one, in ascending order.
 *
 * An utterance is classified against the question that was current WHEN IT WAS
 * SPOKEN, never against the pinned card. Anchoring to the card meant a follow-up
 * from question one silently lost its badge the moment the interview advanced —
 * the preceding answer stopped counting as "after the current question" — and it
 * re-rendered as a plain, untagged "AI interviewer".
 */
function questionAnchors(
  transcript: readonly ConversationTurn[],
  activeTurn: ConversationTurn | null,
): number[] {
  const times = transcript
    .filter(
      (turn) =>
        turn.role === "ai" &&
        AGENT_VOICED_KINDS.has(turn.kind ?? "") &&
        turn.elapsedSeconds !== undefined,
    )
    .map((turn) => turn.elapsedSeconds as number);
  if (activeTurn?.elapsedSeconds !== undefined) {
    times.push(activeTurn.elapsedSeconds);
  }
  return [...new Set(times)].sort((first, second) => first - second);
}

/** The latest anchor at or before `at`, or `-Infinity` when none precedes it. */
function anchorFor(anchors: readonly number[], at: number): number {
  let found = Number.NEGATIVE_INFINITY;
  for (const anchor of anchors) {
    if (anchor <= at) found = anchor;
    else break;
  }
  return found;
}

/**
 * Give every live interviewer utterance the kind its own context implies.
 *
 * Read from the candidate turn it replies to, because that turn already says what
 * was asked of the interviewer: a `clarification` / `hint` request gets a
 * scaffolding reply, an answer to the question in play gets a probe. An utterance
 * that follows no candidate turn of its own question is the interviewer ASKING
 * that question — neither a follow-up nor a clarification, so no badge.
 */
function labelLiveAgentTurns(
  ordered: readonly ConversationTurn[],
  anchors: readonly number[],
): ConversationTurn[] {
  return ordered.map((turn, index) => {
    if (!turn.live || turn.role !== "ai") return turn;
    const anchor = anchorFor(anchors, turn.elapsedSeconds ?? 0);
    return { ...turn, kind: kindFromPrecedingTurn(ordered, index, anchor) };
  });
}

function kindFromPrecedingTurn(
  ordered: readonly ConversationTurn[],
  index: number,
  anchor: number,
): ConversationTurn["kind"] {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const turn = ordered[cursor];
    if (turn.role !== "user") continue;
    if (turn.kind === "clarification" || turn.kind === "hint") return turn.kind;
    // An onboarding reply ("I'm ready to begin.") carries no assessment-clock
    // timestamp, so it is not an answer to any question and must not make the
    // interviewer's first question look like a follow-up.
    const at = turn.elapsedSeconds;
    if (at === undefined) return undefined;
    return at >= anchor ? "followup" : undefined;
  }
  return undefined;
}
/** Everything the header needs to draw its progress row, derived at render
 * time. `Date.now()` is read on every call on purpose: the header already
 * re-renders every second via the `elapsed` string. */
export type HeaderProgress = {
  safeCurrent: number;
  safeTotal: number | null;
  progress: number | null;
  expected: string | null;
};

export function resolveHeaderProgress({
  timerActive,
  assessmentStartedAtMs,
  expectedDurationMinutes,
  currentQuestion,
  totalQuestions,
  outcomeProgress,
}: Pick<
  InterviewHeaderProps,
  | "timerActive"
  | "assessmentStartedAtMs"
  | "expectedDurationMinutes"
  | "currentQuestion"
  | "totalQuestions"
  | "outcomeProgress"
>): HeaderProgress {
  const safeCurrent = Math.max(1, currentQuestion ?? 1);
  const safeTotal = totalQuestions
    ? Math.max(safeCurrent, totalQuestions)
    : null;
  // The learner API intentionally reveals questions one at a time and never
  // exposes a question total, so `safeTotal` is effectively always null and the
  // question-count progress below never applies. Without a fallback the bar sat
  // frozen on the indeterminate 1/3 pulse for the WHOLE session. When the
  // interview has a time limit and the assessed timer is running, drive the bar
  // off elapsed/limit instead so it actually advances. Derived at render time;
  // the header already re-renders every second via the `elapsed` string.
  const timeProgress =
    timerActive &&
    assessmentStartedAtMs != null &&
    expectedDurationMinutes != null &&
    expectedDurationMinutes > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((Date.now() - assessmentStartedAtMs) /
              (expectedDurationMinutes * 60_000)) *
              100,
          ),
        )
      : null;
  // Rubric coverage first when the agent has reported it: it is the measure the
  // verdict is built from. Question count second, elapsed time last.
  const questionProgress = safeTotal
    ? Math.min(100, (safeCurrent / safeTotal) * 100)
    : null;
  const progress = outcomeProgress ?? questionProgress ?? timeProgress;
  const expected = expectedDurationMinutes
    ? formatRelativeInterviewTime(expectedDurationMinutes * 60)
    : null;

  return { safeCurrent, safeTotal, progress, expected };
}
