import { describe, expect, it, vi } from "vitest";

import {
  AGENT_VOICE_START_TIMEOUT_MS,
  createAgentVoiceCoordinator,
  resolveAgentVoicePhase,
} from "../agent-voice-presentation";

/**
 * Pacing of turns the LiveKit AGENT speaks.
 *
 * The double-voice gate correctly silences client narration while the room is
 * live, but it used to do that by returning an already-settled presentation.
 * `AiTypingMessage` holds its text until `presentation.started` resolves — that
 * promise IS the "start the text with the voice" signal — so an instantly
 * resolved one released the typewriter while the agent had not even joined yet.
 * Question one typed itself almost fully before the voice came up.
 *
 * These tests pin the replacement signal (the agent's own `lk.agent.state`) and,
 * just as importantly, the degradation path: with no agent phase ever reported
 * the behaviour must fall back to exactly what shipped before.
 */

/**
 * Whether `promise` has settled, without hanging on one that never will.
 *
 * Flushes a handful of microtask turns first: the presentation promises are
 * built from chained `.then`s, so a single turn is not enough to observe an
 * already-settled one and the check would report a false "still pending".
 */
async function settledNow(promise: Promise<unknown>): Promise<boolean> {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  for (let turn = 0; turn < 10; turn += 1) {
    await Promise.resolve();
  }
  return settled;
}

describe("resolveAgentVoicePhase", () => {
  it("reports speaking only when the agent is actually speaking", () => {
    expect(resolveAgentVoicePhase(true, "speaking")).toBe("speaking");
  });

  it("treats every other live agent state as quiet", () => {
    for (const state of ["initializing", "idle", "listening", "thinking"]) {
      expect(resolveAgentVoicePhase(true, state)).toBe("quiet");
    }
  });

  it("reports unknown when no agent is in the room", () => {
    // No agent → no voice signal exists, and a turn must not wait on one.
    expect(resolveAgentVoicePhase(false, "speaking")).toBe("unknown");
    expect(resolveAgentVoicePhase(false, undefined)).toBe("unknown");
  });

  it("reports unknown for states that carry no voice information", () => {
    expect(resolveAgentVoicePhase(true, "disconnected")).toBe("unknown");
    expect(resolveAgentVoicePhase(true, "connecting")).toBe("unknown");
  });
});

describe("agent voice coordinator", () => {
  it("holds the text until the agent actually starts speaking", async () => {
    const coordinator = createAgentVoiceCoordinator();
    coordinator.setPhase("quiet"); // agent present, not yet speaking

    const presentation = coordinator.present();
    // THE regression: this used to be resolved already, so the text ran ahead
    // of the voice.
    expect(await settledNow(presentation.started)).toBe(false);

    coordinator.setPhase("speaking");
    expect(await settledNow(presentation.started)).toBe(true);
  });

  it("keeps the turn presenting until the agent stops speaking", async () => {
    const coordinator = createAgentVoiceCoordinator();
    coordinator.setPhase("quiet");

    const presentation = coordinator.present();
    coordinator.setPhase("speaking");
    await presentation.started;

    expect(await settledNow(presentation.finished)).toBe(false);
    coordinator.setPhase("quiet");
    expect(await settledNow(presentation.finished)).toBe(true);
  });

  it("releases the text immediately when the agent is already speaking", async () => {
    // A turn that mounts mid-utterance belongs with the audio already playing.
    const coordinator = createAgentVoiceCoordinator();
    coordinator.setPhase("speaking");

    const presentation = coordinator.present();
    expect(await settledNow(presentation.started)).toBe(true);
    expect(await settledNow(presentation.finished)).toBe(false);
  });

  it("degrades to the previous behaviour when no agent phase is ever reported", async () => {
    // Flag off, agent never joined, or a future SDK stops publishing the
    // attribute: the turn must NOT wait on a signal that will never arrive.
    const coordinator = createAgentVoiceCoordinator();

    const presentation = coordinator.present();
    expect(await settledNow(presentation.started)).toBe(true);
    expect(await settledNow(presentation.finished)).toBe(true);
  });

  it("still reports unknown-only phases as no signal", async () => {
    const coordinator = createAgentVoiceCoordinator();
    coordinator.setPhase("unknown");

    const presentation = coordinator.present();
    expect(await settledNow(presentation.started)).toBe(true);
  });

  it("releases the text on timeout if the agent never speaks", async () => {
    vi.useFakeTimers();
    try {
      const coordinator = createAgentVoiceCoordinator();
      coordinator.setPhase("quiet");

      const presentation = coordinator.present();
      expect(await settledNow(presentation.started)).toBe(false);

      // A late caption beats a screen stuck on the preparing indicator.
      await vi.advanceTimersByTimeAsync(AGENT_VOICE_START_TIMEOUT_MS + 1);
      expect(await settledNow(presentation.started)).toBe(true);
      // The agent never spoke, so there is no playout left to wait out.
      expect(await settledNow(presentation.finished)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("paces several turns independently across one speaking run", async () => {
    const coordinator = createAgentVoiceCoordinator();
    coordinator.setPhase("quiet");

    const first = coordinator.present();
    coordinator.setPhase("speaking");
    await first.started;
    coordinator.setPhase("quiet");
    await first.finished;

    // Next turn must wait for the NEXT utterance, not reuse the last one.
    const second = coordinator.present();
    expect(await settledNow(second.started)).toBe(false);
    coordinator.setPhase("speaking");
    expect(await settledNow(second.started)).toBe(true);
  });

  it("does not settle waiters when the same phase is re-reported", async () => {
    // The screen writes the phase during EVERY render; only transitions count.
    const coordinator = createAgentVoiceCoordinator();
    coordinator.setPhase("quiet");

    const presentation = coordinator.present();
    coordinator.setPhase("quiet");
    coordinator.setPhase("quiet");
    expect(await settledNow(presentation.started)).toBe(false);
  });
});
