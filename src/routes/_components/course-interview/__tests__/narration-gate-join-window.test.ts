import { describe, expect, it } from "vitest";

/**
 * When the client is allowed to narrate, versus when the agent owns the voice.
 *
 * This is a pure-predicate mirror of the expression in
 * `InterviewWorkspaceScreen`:
 *
 *     const agentOwnsTheVoice = roomWanted || connecting || chat.connected;
 *
 * It exists because the previous predicate (`connecting || chat.connected`) had
 * a hole that only opened in production timing, and reasoning about it from the
 * source was not enough to see it.
 *
 * The hole, measured on session 43a25e3d:
 *
 *   08:04:09.298  realtime-token 200      <- prefetch already has the token
 *   08:04:09.306  POST /narration 127ms   <- client narrates question one
 *   08:04:19.265  agent room_join         <- agent says the SAME question again
 *
 * `connecting` is `active && (isFetchingToken || !tokenData)`. The token
 * prefetch deliberately mints the token DURING the transition beat, so when
 * `active` finally flips, `tokenData` is already present — `connecting` is
 * false, `chat.connected` is still false, and the gate is open for the entire
 * ~10s the agent takes to join. Reported as: "phát ok rồi giữa chừng đứng lại
 * rồi phát lại từ đầu" — the client's narration cut off by the agent starting
 * the same question from the top.
 *
 * `roomWanted` (the provider's `active`) closes it: it is true across the whole
 * join. Crucially it is FALSE during the transition beat, so the client-only
 * transition line is still narrated — that line is the reason `connecting` was
 * introduced in the first place, and re-muting it would regress the earlier bug.
 */

function agentOwnsTheVoice(args: {
  roomWanted: boolean;
  connecting: boolean;
  chatConnected: boolean;
}): boolean {
  return args.roomWanted || args.connecting || args.chatConnected;
}

const TEXT_ONLY = {
  roomWanted: false,
  connecting: false,
  chatConnected: false,
};

describe("narration gate vs the room lifecycle", () => {
  it("closes during the join window even when the token was prefetched", () => {
    // THE bug. active=true, token already in hand, agent not yet joined.
    expect(
      agentOwnsTheVoice({
        roomWanted: true,
        connecting: false,
        chatConnected: false,
      }),
    ).toBe(true);
  });

  it("stays OPEN during the transition beat so its line is still spoken", () => {
    // The beat holds `active` back precisely so the client can voice the
    // transition ("Great—the introduction is complete…"), which the agent never
    // receives. Closing here would regress that fix.
    expect(agentOwnsTheVoice(TEXT_ONLY)).toBe(false);
  });

  it("closes while the token is still being fetched", () => {
    // The original case `connecting` was added for: no prefetch, token in
    // flight, first question arriving in that window.
    expect(
      agentOwnsTheVoice({
        roomWanted: true,
        connecting: true,
        chatConnected: false,
      }),
    ).toBe(true);
  });

  it("closes once the room is actually connected", () => {
    expect(
      agentOwnsTheVoice({
        roomWanted: true,
        connecting: false,
        chatConnected: true,
      }),
    ).toBe(true);
  });

  it("stays open for a text-only session that never wants a room", () => {
    // Nothing else can speak, so the client narration is the only voice.
    expect(agentOwnsTheVoice(TEXT_ONLY)).toBe(false);
  });

  it("closes if the chat reports connected before roomWanted propagates", () => {
    // Defensive: the three signals come from different sources and can race.
    expect(
      agentOwnsTheVoice({
        roomWanted: false,
        connecting: false,
        chatConnected: true,
      }),
    ).toBe(true);
  });

  it("reopens after the room drops, so REST fallback keeps a voice", () => {
    // A dropped room falls back to REST /respond; with no agent in the room the
    // client narration is again the only thing that can speak.
    expect(agentOwnsTheVoice(TEXT_ONLY)).toBe(false);
  });
});
