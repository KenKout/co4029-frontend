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
 * The in-session CAMERA ON indicator — placement contract.
 *
 * The pill sits on the SAME line as the Connected pill (leading it, before
 * the timer and the action buttons). The user explicitly chose this row
 * after seeing it stacked below the buttons.
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

  it("shares ONE row with the Connected pill, leading it", () => {
    render(<InterviewHeader {...BASE} cameraOn />);

    const camPill = screen.getByTitle("Đang bật cam");
    const connPill = screen.getByTitle("Đã kết nối");
    const timer = screen.getByLabelText("Thời gian phỏng vấn đã trôi qua");
    // All three live in the SAME row container...
    expect(camPill.parentElement).toBe(connPill.parentElement);
    expect(connPill.parentElement).toBe(timer.parentElement);
    // ...with the camera pill FIRST (left of Connected).
    expect(
      camPill.compareDocumentPosition(connPill) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
