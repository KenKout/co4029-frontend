/**
 * RoomControlBar mic-state mirror semantics.
 *
 * The bar mirrors the local mic track into the controller's `micOn` (via
 * `onMicEnabledChange`), which the room provider uses as its `audio` prop.
 * The mirror exists for exactly one purpose: catching the CANDIDATE toggling
 * the mic. It must stay silent otherwise — in particular on mount, where the
 * track is often not yet published even though the auto-on has just set
 * `micOn=true`: the bar mounts in the same commit as the setup→questioning
 * flip, the provider publishes the mic only on the NEXT render (when `audio`
 * turns true), and reporting that not-yet-published `false` overwrote the
 * auto-on in the same React batch — the latched auto-on never fired again and
 * the mic stayed off for the whole session.
 *
 * Hence: mirror TRANSITIONS only (a real track change after a known previous
 * state), never an initial observation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";

// Scenario shared by the mocks below. Each test mutates it BEFORE rendering.
const scenario = {
  isMicrophoneEnabled: false,
  roomState: "connected" as "connected" | "disconnected",
};

vi.mock("@livekit/components-react", () => ({
  useTrackToggle: () => ({
    enabled: scenario.isMicrophoneEnabled,
    toggle: vi.fn(),
    pending: false,
  }),
  useLocalParticipant: () => ({
    // New object identity per render, like the real hook re-emitting the
    // participant — what makes the mirror effect re-run on updates.
    localParticipant: {
      isMicrophoneEnabled: scenario.isMicrophoneEnabled,
    },
    microphoneTrack: scenario.isMicrophoneEnabled
      ? { sid: "TR_mic" }
      : undefined,
  }),
  useRoomContext: () => ({
    state: scenario.roomState,
  }),
  BarVisualizer: () => <div data-testid="visualizer" />,
}));

vi.mock("livekit-client", () => ({
  Track: {
    Source: { Microphone: "microphone" },
  },
  ConnectionState: {
    Connected: "connected",
    Disconnected: "disconnected",
  },
}));

import { RoomControlBar } from "../composer/RoomControlBar";

function renderBar(onMicEnabledChange: (enabled: boolean) => void) {
  const view = render(
    <RoomControlBar
      onEndInterview={() => undefined}
      onMicEnabledChange={onMicEnabledChange}
    />,
  );
  return () =>
    act(async () => {
      // Re-render with the mutated scenario; the mock's fresh participant
      // object re-runs the mirror effect like a real track update.
      view.rerender(
        <RoomControlBar
          onEndInterview={() => undefined}
          onMicEnabledChange={onMicEnabledChange}
        />,
      );
    });
}

describe("RoomControlBar mic mirror", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scenario.isMicrophoneEnabled = false;
    scenario.roomState = "connected";
  });

  it("stays silent on mount even when the track is not yet published (auto-on race)", () => {
    const onMicEnabledChange = vi.fn<(enabled: boolean) => void>();
    renderBar(onMicEnabledChange);
    expect(onMicEnabledChange).not.toHaveBeenCalled();
  });

  it("stays silent on mount when the track is already published", () => {
    scenario.isMicrophoneEnabled = true;
    const onMicEnabledChange = vi.fn<(enabled: boolean) => void>();
    renderBar(onMicEnabledChange);
    expect(onMicEnabledChange).not.toHaveBeenCalled();
  });

  it("reports a false→true transition (candidate toggles the mic on)", async () => {
    const onMicEnabledChange = vi.fn<(enabled: boolean) => void>();
    const update = renderBar(onMicEnabledChange);
    scenario.isMicrophoneEnabled = true;
    await update();
    expect(onMicEnabledChange).toHaveBeenCalledWith(true);
  });

  it("reports a true→false transition (candidate toggles the mic off)", async () => {
    scenario.isMicrophoneEnabled = true;
    const onMicEnabledChange = vi.fn<(enabled: boolean) => void>();
    const update = renderBar(onMicEnabledChange);
    scenario.isMicrophoneEnabled = false;
    await update();
    expect(onMicEnabledChange).toHaveBeenCalledWith(false);
  });

  it("does not report the same state twice", async () => {
    const onMicEnabledChange = vi.fn<(enabled: boolean) => void>();
    const update = renderBar(onMicEnabledChange);
    scenario.isMicrophoneEnabled = true;
    await update();
    await update();
    expect(onMicEnabledChange).toHaveBeenCalledTimes(1);
  });

  it("stays silent while the room is not connected and after a reconnect's first reading", async () => {
    const onMicEnabledChange = vi.fn<(enabled: boolean) => void>();
    const update = renderBar(onMicEnabledChange);

    // A drop unpublishes tracks; the mirror must not report that as a mute.
    scenario.roomState = "disconnected";
    scenario.isMicrophoneEnabled = false;
    await update();
    expect(onMicEnabledChange).not.toHaveBeenCalled();

    // Reconnect: the provider's own reconnect sync re-publishes the mic; the
    // mirror's first post-reconnect reading is an observation, not a toggle.
    scenario.roomState = "connected";
    scenario.isMicrophoneEnabled = true;
    await update();
    expect(onMicEnabledChange).not.toHaveBeenCalled();

    // But a real toggle after the reconnect is still reported.
    scenario.isMicrophoneEnabled = false;
    await update();
    expect(onMicEnabledChange).toHaveBeenCalledWith(false);
  });
});
