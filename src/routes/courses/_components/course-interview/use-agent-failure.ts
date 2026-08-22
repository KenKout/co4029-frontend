/**
 * Combine the two ways the agent voice can be dead, and tell the candidate once.
 *
 * `lk.agent.state === "failed"` only covers a worker that joined and then
 * reported failure. An agent that was never dispatched publishes no state at
 * all, so "never showed up" and "still joining" look identical without a
 * deadline — the watchdog supplies that deadline.
 *
 * Both funnel into one boolean so the toast fires once, whichever half went
 * wrong, with the same message: the interview continues in text, and it is
 * graded the same way.
 */

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAgentJoinWatchdog } from "./use-agent-join-watchdog";

export function useAgentFailure({
  expected,
  agentPresent,
  state,
}: {
  /** An agent has been dispatched and is on its way. */
  expected: boolean;
  /** An agent participant is in the room. */
  agentPresent: boolean;
  /** `lk.agent.state` from `useVoiceAssistant`. */
  state: string | undefined;
}): { joinTimedOut: boolean; agentFailed: boolean } {
  const { t } = useTranslation();

  const joinTimedOut = useAgentJoinWatchdog({ expected, agentPresent });
  const agentFailed = state === "failed" || joinTimedOut;

  // Tell them once. Previously the "unknown" phase meant "keep waiting", so a
  // dead agent made every turn sit out the full 20s start timeout in silence
  // with no explanation at all.
  const failureToldRef = useRef(false);
  useEffect(() => {
    if (!agentFailed || failureToldRef.current) return;
    failureToldRef.current = true;
    toast.warning(t("course_interview.agent_failed.title"), {
      description: t("course_interview.agent_failed.body"),
      duration: 10_000,
    });
  }, [agentFailed, t]);

  return { joinTimedOut, agentFailed };
}
