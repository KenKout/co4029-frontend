import { describe, expect, it } from "vitest";

import { StreamOrderTracker } from "@/lib/interview/stream-order";

/**
 * Ordering matrix for the control-topic stream epoch (plan §4 frontend tests):
 * same-stream duplicate/out-of-order drop, agent A seq 100 → agent B seq 1
 * acceptance, late A-frame drop after the switch, legacy behaviour before and
 * after tagged traffic.
 */
describe("StreamOrderTracker", () => {
  it("accepts a first tagged frame and duplicates/out-of-order within one stream are dropped", () => {
    const t = new StreamOrderTracker();

    expect(t.accept({ seq: 5, streamId: "a" })).toBe(true);
    // duplicate
    expect(t.accept({ seq: 5, streamId: "a" })).toBe(false);
    // out of order (older)
    expect(t.accept({ seq: 4, streamId: "a" })).toBe(false);
    // newer within the same stream
    expect(t.accept({ seq: 6, streamId: "a" })).toBe(true);
    expect(t.currentStreamId()).toBe("a");
  });

  it("a new epoch replaces the active one: agent A seq 100 then agent B seq 1 is accepted", () => {
    const t = new StreamOrderTracker();

    expect(t.accept({ seq: 100, streamId: "agent-a" })).toBe(true);
    expect(t.accept({ seq: 101, streamId: "agent-a" })).toBe(true);

    // Replacement agent in the SAME room: new epoch, seq restarts at 1.
    expect(t.accept({ seq: 1, streamId: "agent-b" })).toBe(true);
    expect(t.currentStreamId()).toBe("agent-b");
    expect(t.retiredStreamIds()).toContain("agent-a");

    // B's own ordering now applies from 1.
    expect(t.accept({ seq: 2, streamId: "agent-b" })).toBe(true);
  });

  it("a late frame from the retired epoch is dropped even with a higher seq", () => {
    const t = new StreamOrderTracker();

    expect(t.accept({ seq: 100, streamId: "agent-a" })).toBe(true);
    expect(t.accept({ seq: 1, streamId: "agent-b" })).toBe(true);

    // A seq 101 arrives late (delivery-order guarantee does not exist across
    // streams): it must not roll the UI back to the old agent.
    expect(t.accept({ seq: 101, streamId: "agent-a" })).toBe(false);
  });

  it("ack, failed, snapshot and agent_action statuses all follow the same epoch policy", () => {
    // The tracker only sees {seq, streamId}; the STATUS fan-out happens after
    // the guard in the hook. Every status rides the same accept() path —
    // pinned here so a per-status bypass cannot be added silently.
    const t = new StreamOrderTracker();
    const statuses = ["accepted", "failed", "snapshot", "agent_action"] as const;

    for (const [i] of statuses.entries()) {
      expect(t.accept({ seq: i + 1, streamId: "a" })).toBe(true);
    }
    // Each status re-sent at its old seq: dropped.
    for (const [i] of statuses.entries()) {
      expect(t.accept({ seq: i + 1, streamId: "a" })).toBe(false);
    }
  });

  it("legacy untagged frames order globally BEFORE any tagged stream", () => {
    const t = new StreamOrderTracker();

    expect(t.accept({ seq: 10, streamId: null })).toBe(true);
    expect(t.accept({ seq: 10, streamId: null })).toBe(false);
    expect(t.accept({ seq: 11, streamId: null })).toBe(true);
    expect(t.accept({ seq: 5, streamId: null })).toBe(false);
  });

  it("after a tagged stream is active, a late legacy frame is dropped", () => {
    const t = new StreamOrderTracker();

    expect(t.accept({ seq: 10, streamId: null })).toBe(true);
    expect(t.accept({ seq: 1, streamId: "a" })).toBe(true);

    // The old untagged agent's frame arrives after the tagged agent took over.
    expect(t.accept({ seq: 11, streamId: null })).toBe(false);
    // Even a LOW untagged seq (a fresh agent without the tag) stays dropped —
    // mixing semantics would risk rollbacks; restart-seq legacy agents are
    // handled by the room-level reconnect, not here.
    expect(t.accept({ seq: 1, streamId: null })).toBe(false);
  });

  it("the retired set is bounded", () => {
    const t = new StreamOrderTracker();

    for (let i = 0; i < 20; i++) {
      expect(t.accept({ seq: 1, streamId: `epoch-${i}` })).toBe(true);
    }
    // 19 retired epochs cycled through; the cap keeps memory bounded.
    expect(t.retiredStreamIds().length).toBeLessThanOrEqual(8);
    expect(t.currentStreamId()).toBe("epoch-19");
  });
});
