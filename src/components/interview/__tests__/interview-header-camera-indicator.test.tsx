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
 * The pill lives in the header's trailing cell, BELOW the voice/End button
 * cluster (right-flush, its own row). It must NOT sit in
 * InterviewHeaderStatus (that squeezed the Connected/timer row and the
 * button row apart) and must NOT share a line with them.
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

  it("sits in the trailing cell BELOW the action-button row", () => {
    render(<InterviewHeader {...BASE} cameraOn />);

    // onEndInterview is undefined in this harness, so the End button is not
    // rendered; the first row of the trailing cell is the voice button's row.
    const voiceRow = screen
      .getByRole("button", { name: "Tắt giọng đọc của AI" })
      .closest("button")!.parentElement!;
    const camPill = screen.getByTitle("Đang bật cam");
    const camRow = camPill.parentElement!;
    // A different row than the buttons...
    expect(camRow).not.toBe(voiceRow);
    // ...inside the SAME trailing cell (stacked under the buttons)...
    expect(camRow.parentElement).toBe(voiceRow.parentElement);
    // ...and AFTER the button row in DOM order.
    expect(
      voiceRow.parentElement!.compareDocumentPosition(camRow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("leaves Connected and the timer on one single row", () => {
    render(<InterviewHeader {...BASE} cameraOn />);

    const connPill = screen.getByTitle("Đã kết nối");
    const timer = screen.getByLabelText("Thời gian phỏng vấn đã trôi qua");
    expect(connPill.parentElement).toBe(timer.parentElement);
  });

  it("renders nothing when the camera is off — no lying chrome", () => {
    render(<InterviewHeader {...BASE} />);

    expect(screen.queryByText("Đang bật cam")).not.toBeInTheDocument();
  });
});
