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
 * on — an icon alone can be mistaken for a decorative glyph. The pill sits
 * UNDER the "Connected" text (a vertical stack in the trailing cell), NOT on
 * the same line — on the line it read as a duplicate of the "Interview in
 * progress" status. Off/gate-off renders nothing (no lying chrome).
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

  it("sits BELOW the Connected row — its own line in a stacked column", () => {
    render(<InterviewHeader {...BASE} cameraOn />);

    const cam = screen.getByText("Đang bật cam").closest("span");
    const conn = screen.getByText("Đã kết nối").closest("span");
    expect(cam).not.toBeNull();
    expect(conn).not.toBeNull();
    // Different row containers: the camera pill is NOT squeezed onto the
    // Connected/timer line (that is what read as a duplicate of the
    // "Interview in progress" text).
    expect(cam!.parentElement).not.toBe(conn!.parentElement);
    // ...and the camera row comes AFTER the Connected row in the column.
    expect(
      conn!.parentElement!.compareDocumentPosition(cam!.parentElement!) &
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
