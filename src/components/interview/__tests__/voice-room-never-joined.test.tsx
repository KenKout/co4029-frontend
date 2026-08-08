import { render } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VoiceRoom } from "../voice-room";
import { AGENT_JOIN_DEADLINE_MS } from "@/routes/_components/course-interview/agent-voice-presentation";

// The room provider, LiveKit hooks and styles are all mocked wholesale, same
// pattern as voice-controls.test.tsx: this test is about the watchdog wiring,
// not about LiveKit itself.

let mockAgent: object | undefined = undefined;
let mockCanPlayAudio = true;

vi.mock("@livekit/components-react", () => ({
  useConnectionState: () => "connected",
  useVoiceAssistant: () => ({
    agent: mockAgent,
    state: mockAgent ? "speaking" : undefined,
    agentTranscriptions: [],
  }),
  useTranscriptions: () => [],
  useTrackToggle: () => ({
    enabled: false,
    pending: false,
    toggle: vi.fn(),
  }),
  useStartAudio: () => ({
    mergedProps: { onClick: vi.fn() },
    canPlayAudio: mockCanPlayAudio,
  }),
}));

vi.mock("livekit-client", () => ({
  ConnectionState: {
    Connecting: "connecting",
    Connected: "connected",
    Reconnecting: "reconnecting",
    Disconnected: "disconnected",
  },
  Track: { Source: { Microphone: "microphone" } },
}));

vi.mock("../interview-room-provider", () => ({
  useInterviewRoomState: () => ({
    room: { name: "interview-test" },
    connecting: false,
    roomWanted: true,
  }),
}));

vi.mock("@livekit/components-styles", () => ({}));

describe("VoiceRoom agent never joins", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockAgent = undefined;
    mockCanPlayAudio = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire when the agent is present from the start", () => {
    mockAgent = { identity: "interview-agent" };

    const onAgentNeverJoined = vi.fn();
    render(
      <VoiceRoom
        onCompleted={vi.fn()}
        onAgentNeverJoined={onAgentNeverJoined}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(onAgentNeverJoined).not.toHaveBeenCalled();
  });

  it("fires once when the deadline passes with no agent", () => {
    const onAgentNeverJoined = vi.fn();
    render(
      <VoiceRoom
        onCompleted={vi.fn()}
        onAgentNeverJoined={onAgentNeverJoined}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(AGENT_JOIN_DEADLINE_MS + 1_000);
    });

    expect(onAgentNeverJoined).toHaveBeenCalledTimes(1);
  });

  it("shows the enable-audio button while playback is blocked and hides it once allowed", () => {
    const { queryByRole, rerender } = render(
      <VoiceRoom onCompleted={vi.fn()} onAgentNeverJoined={vi.fn()} />,
    );
    mockCanPlayAudio = false;
    rerender(<VoiceRoom onCompleted={vi.fn()} onAgentNeverJoined={vi.fn()} />);
    // The setup flips i18n to vi asynchronously, so match either locale.
    expect(
      queryByRole("button", {
        name: /Enable interviewer audio|Bật tiếng người phỏng vấn/,
      }),
    ).not.toBeNull();

    mockCanPlayAudio = true;
    rerender(<VoiceRoom onCompleted={vi.fn()} onAgentNeverJoined={vi.fn()} />);
    expect(
      queryByRole("button", {
        name: /Enable interviewer audio|Bật tiếng người phỏng vấn/,
      }),
    ).toBeNull();
  });
});
