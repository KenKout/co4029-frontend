/**
 * Is the answer surface locked against a second submission?
 *
 * The handler already refuses a duplicate (`resolveSubmitGate` in
 * interview-answer-actions blocks on `submitting`/`submitted` plus the transport's
 * own pending flag), so this is not about correctness of the request — it is
 * about the UI telling the truth. The composer's `sending` prop was derived from
 * `respond.isPending` alone, which leaves a real gap:
 *
 *   t0  submit                  isPending true          -> locked
 *   t1  the turn is accepted    isPending false,
 *                               the next turn has not mounted yet so
 *                               aiSpeaking/aiPresenting are still false
 *                                                       -> UNLOCKED  <- the gap
 *   t2  next question mounts    aiPresenting true        -> locked again
 *
 * On the LiveKit transport t1 arrives as soon as the agent's control stream says
 * `completed` — the agent then still has to speak the reply. So the textarea, the
 * mic and Send all became live again for a beat, invited a second answer, and the
 * handler silently dropped it. The candidate saw an enabled Send that did
 * nothing.
 *
 * `answer.state.status === "submitted"` closes exactly that gap: the machine
 * leaves `submitted` only on `resetForQuestion` (a new question arrived) or
 * `reopenForFollowUp` (the AI asked something about this same answer) — which is
 * precisely "until the answer has been analysed and the AI has responded".
 */
export function isComposerLocked(args: {
  /** `answer.state.status` from the submission state machine. */
  answerStatus: string;
  /** The active transport's in-flight flag (chat.pending or respond.isPending). */
  requestPending: boolean;
  /** `agentStatus` — covers the AI thinking/speaking and a dropped connection. */
  agentStatus: string;
}): boolean {
  if (args.answerStatus === "submitting" || args.answerStatus === "submitted") {
    return true;
  }
  if (args.requestPending) return true;
  return (
    args.agentStatus === "thinking" ||
    args.agentStatus === "speaking" ||
    args.agentStatus === "disconnected"
  );
}
