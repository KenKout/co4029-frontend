/**
 * Watch for an agent that was expected but never arrived.
 *
 * Separate from `lk.agent.state === "failed"` on purpose: that attribute is
 * published BY the agent participant, so it can only report a worker that
 * joined and then failed. An agent that was never dispatched publishes nothing,
 * and is indistinguishable from one still joining — except by elapsed time.
 */

import { useEffect, useRef, useState } from "react";

import { AGENT_JOIN_DEADLINE_MS } from "./agent-voice-presentation";

export function useAgentJoinWatchdog({
  expected,
  agentPresent,
  deadlineMs = AGENT_JOIN_DEADLINE_MS,
}: {
  /** An agent has been dispatched and is on its way. */
  expected: boolean;
  /** An agent participant is in the room. */
  agentPresent: boolean;
  deadlineMs?: number;
}): boolean {
  const [timedOut, setTimedOut] = useState(false);
  // Latches until the room stops wanting an agent. Without this the watchdog
  // would flap: clearing on any re-render that briefly reports the agent
  // present would re-arm the timer and re-toast.
  const latched = useRef(false);

  useEffect(() => {
    if (!expected) {
      latched.current = false;
      setTimedOut(false);
      return;
    }
    if (agentPresent) {
      // Arrived (pre-deadline). Cancel the pending timer and never re-arm for
      // the rest of the session: an agent that joins and later leaves is a
      // disconnect, handled elsewhere. Deliberately does NOT clear an already
      // fired timeout — once the candidate has been told the voice is off, a
      // late participant should not contradict that message.
      latched.current = true;
      return;
    }
    if (latched.current) return;

    const timer = window.setTimeout(() => {
      latched.current = true;
      setTimedOut(true);
    }, deadlineMs);
    return () => window.clearTimeout(timer);
  }, [expected, agentPresent, deadlineMs]);

  return timedOut;
}
