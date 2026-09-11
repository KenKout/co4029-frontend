/**
 * Control-event ordering across agent epochs.
 *
 * Pure logic, split out of `use-interview-chat` so the epoch matrix (same-stream
 * duplicates, cross-agent epoch replacement, legacy untagged frames) is unit
 * testable without a room.
 *
 * The wire contract (backend `text_protocol.ControlEvent.stream_id`): each
 * publishing agent stamps an opaque UUID epoch on every frame, under the same
 * lock that allocates `seq`. A replacement agent in the SAME room presents a NEW
 * epoch with `seq` restarted at 1 — a global last-seen sequence would read the
 * new agent's frames as stale and drop every ack, leaving the candidate's
 * composer parked forever.
 *
 * Rules:
 * - A frame tagged with a stream id starts/switches the ACTIVE epoch; the
 *   previous epoch is retired (bounded set) and its frames are always dropped.
 * - `seq` is compared only WITHIN the active epoch.
 * - Untagged (legacy) frames order against `legacySeq` while no epoch has been
 *   seen. Once a tagged stream is active, a late legacy frame must NOT roll the
 *   UI back — it is dropped.
 */

export interface OrderDecision {
  accept: boolean;
  /** Accepted as the newest frame of the ACTIVE tagged epoch. */
  readonly activeStreamId: string | null;
}

/**
 * Ordering tracker: active epoch, last seq within it, bounded retired set, and
 * the legacy global sequence for untagged frames.
 */
export class StreamOrderTracker {
  private activeStreamId: string | null = null;
  private activeLastSeq = -1;
  private legacyLastSeq = -1;
  private readonly retired = new Set<string>();

  /** Epochs ever seen minus the active one, capped so memory stays bounded. */
  private readonly RETIRED_CAP = 8;

  /**
   * Decide whether one parsed control event may be applied.
   *
   * `streamId === null` means a legacy frame; anything else switches or
   * continues the active epoch.
   */
  accept(event: { seq: number; streamId: string | null }): boolean {
    if (event.streamId !== null) {
      if (this.retired.has(event.streamId)) {
        // A frame from an epoch that has already been replaced.
        return false;
      }
      if (this.activeStreamId !== null && event.streamId !== this.activeStreamId) {
        // A NEW epoch: retire the old one, reset the in-stream sequence. The
        // new agent's seq 1 must be accepted even though the old agent's seq
        // was far higher.
        this.retired.add(this.activeStreamId);
        this.trimRetired();
        this.activeStreamId = event.streamId;
        this.activeLastSeq = -1;
      }
      if (this.activeStreamId === null) {
        this.activeStreamId = event.streamId;
        this.activeLastSeq = -1;
      }
      if (event.seq <= this.activeLastSeq) {
        // Duplicate or out-of-order WITHIN the active epoch.
        return false;
      }
      this.activeLastSeq = event.seq;
      return true;
    }

    // Legacy frame (no tag).
    if (this.activeStreamId !== null) {
      // Tagged traffic is authoritative once seen: a late untagged frame can
      // only be a replay from before the epoch switch.
      return false;
    }
    if (event.seq <= this.legacyLastSeq) {
      return false;
    }
    this.legacyLastSeq = event.seq;
    return true;
  }

  /** The currently active epoch, for consumers that must reset per-epoch state. */
  currentStreamId(): string | null {
    return this.activeStreamId;
  }

  /** Retired epoch ids still tracked (bounded; oldest are evicted). */
  retiredStreamIds(): readonly string[] {
    return [...this.retired];
  }

  private trimRetired(): void {
    while (this.retired.size > this.RETIRED_CAP) {
      const oldest = this.retired.values().next().value;
      if (oldest === undefined) break;
      this.retired.delete(oldest);
    }
  }
}
