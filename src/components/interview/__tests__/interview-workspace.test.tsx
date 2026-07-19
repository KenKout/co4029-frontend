import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AnswerComposer,
  EndInterviewDialog,
  formatRelativeInterviewTime,
} from "../interview-workspace";

describe("formatRelativeInterviewTime", () => {
  it("formats transcript timestamps relative to interview start", () => {
    expect(formatRelativeInterviewTime(0)).toBe("0:00");
    expect(formatRelativeInterviewTime(65)).toBe("1:05");
    expect(formatRelativeInterviewTime(3661)).toBe("1:01:01");
  });
});

function renderComposer(value: string, onSubmit = vi.fn()) {
  render(
    <AnswerComposer
      value={value}
      draftLength={value.length}
      onChange={() => undefined}
      onSubmit={onSubmit}
      sending={false}
      micAvailable={false}
      micActive={false}
      onMicToggle={() => undefined}
      transcriptOpen
      onTranscriptToggle={() => undefined}
      elapsed="00:12"
      status={value.trim() ? "ready" : "idle"}
      onEndInterview={() => undefined}
    />,
  );
  return onSubmit;
}

describe("AnswerComposer", () => {
  it("sends a non-empty answer with Enter", () => {
    const onSubmit = renderComposer("A complete answer");
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps Shift + Enter for a new line", () => {
    const onSubmit = renderComposer("A complete answer");
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: true,
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not send an empty answer", () => {
    const onSubmit = renderComposer("   ");
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /gửi câu trả lời/i })).toBeDisabled();
  });
});

describe("EndInterviewDialog", () => {
  it("warns that an unsent answer may be lost", () => {
    render(
      <EndInterviewDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        isPending={false}
      />,
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /câu trả lời chưa gửi hiện tại có thể bị mất/i,
    );
  });
});
