import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/me/profile">{children}</a>
  ),
}));

import { InterviewHeader } from "@/components/interview/stages";

/**
 * The in-session CAMERA ON indicator.
 *
 * While a camera-gated interview is live the header must SAY the camera is
 * on — an icon alone can be mistaken for a decorative glyph, and the whole
 * point is that the candidate knows the local camera is running. Off/gate-off
 * renders nothing (no lying chrome), mirroring how showVoiceControl hides the
 * narration toggle.
 */

const BASE = {
  slug: "data-course",
  courseName: "Data Engineering",
  interviewTitle: "Technical interview",
  elapsed: "07:19",
  currentQuestion: 2,
  totalQuestions: 8,
  connected: true,
  voiceOn: true,
  onToggleVoice: () => undefined,
};

describe("InterviewHeader camera indicator", () => {
  it("shows a camera-on pill with text while the camera is live", () => {
    render(<InterviewHeader {...BASE} cameraOn />);

    expect(screen.getByText("Đang bật cam")).toBeInTheDocument();
  });

  it("renders nothing when the camera is off — no lying chrome", () => {
    render(<InterviewHeader {...BASE} />);

    expect(screen.queryByText("Đang bật cam")).not.toBeInTheDocument();
  });

  it("is also hidden when the prop is passed false explicitly", () => {
    render(<InterviewHeader {...BASE} cameraOn={false} />);

    expect(screen.queryByText("Đang bật cam")).not.toBeInTheDocument();
  });
});
