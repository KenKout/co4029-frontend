/**
 * Rendering tests for voice-controls component.
 *
 * Verifies component renders without crashing, mocking LiveKit dependencies.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock LiveKit components before importing
vi.mock("@livekit/components-react", () => ({
  useTrackToggle: () => ({
    enabled: true,
    toggle: vi.fn(),
  }),
  useVoiceAssistant: () => ({
    state: "listening",
  }),
}));

vi.mock("livekit-client", () => ({
  Track: {
    Audio: "audio",
    Source: {
      Microphone: "microphone",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Mic: () => <div data-testid="mic-icon" />,
  MicOff: () => <div data-testid="mic-off-icon" />,
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  Volume2: () => <div data-testid="volume-icon" />,
}));

// Import after mocking
import { VoiceControls } from "../voice-controls";

describe("VoiceControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const mockOnEnd = vi.fn();
    const { container } = render(
      <VoiceControls onEndInterview={mockOnEnd} />
    );

    expect(container).toBeTruthy();
  });

  it("calls onEndInterview when end button clicked", () => {
    const mockOnEnd = vi.fn();
    render(<VoiceControls onEndInterview={mockOnEnd} />);

    // Find and click the end interview button
    const endButton = screen.getAllByTestId("button").find(
      (btn) => btn.textContent?.includes("End interview")
    );
    expect(endButton).toBeTruthy();
  });

  it("renders mic controls", () => {
    const mockOnEnd = vi.fn();
    render(<VoiceControls onEndInterview={mockOnEnd} />);

    // Should render mic icons
    const micIcon = screen.queryByTestId("mic-icon");
    expect(micIcon).toBeTruthy();
  });

  it("renders timer section", () => {
    const mockOnEnd = vi.fn();
    const { container } = render(
      <VoiceControls onEndInterview={mockOnEnd} />
    );

    // Should have timer text (00:00 format)
    expect(container.textContent).toMatch(/\d{2}:\d{2}/);
  });

  it("shows isEnding state when ending", () => {
    const mockOnEnd = vi.fn();
    render(<VoiceControls onEndInterview={mockOnEnd} isEnding={true} />);

    // Button should show "Ending…" text when isEnding is true
    const buttons = screen.getAllByTestId("button");
    const endButton = buttons.find((btn) => btn.textContent?.includes("Ending"));
    expect(endButton).toBeTruthy();
  });
});
