import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { SubmittedAnswerConfirmation } from "../submitted-answer-confirmation";

const LONG_ANSWER =
  "A fact table contains measurable business events, while a factless fact " +
  "table records the occurrence of an event without any additive measures. " +
  "It is used for coverage or many-to-many relationships between dimensions.";

describe("SubmittedAnswerConfirmation", () => {
  it("renders a compact success confirmation with a preview and expand control", () => {
    render(
      <SubmittedAnswerConfirmation status="submitted" answer={LONG_ANSWER} />,
    );
    expect(
      screen.getByText(i18n.t("course_interview.submission.submitted_title")),
    ).toBeInTheDocument();
    // Preview text present.
    expect(screen.getByText(/A fact table contains/)).toBeInTheDocument();
    // Collapsed by default: line-clamp-3 applied.
    expect(screen.getByText(/A fact table contains/)).toHaveClass("line-clamp-3");
  });

  it("expands and collapses the preview via an accessible toggle", () => {
    render(
      <SubmittedAnswerConfirmation status="submitted" answer={LONG_ANSWER} />,
    );
    const toggle = screen.getByRole("button", {
      name: i18n.t("course_interview.submission.expand"),
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", {
        name: i18n.t("course_interview.submission.collapse"),
      }),
    ).toHaveAttribute("aria-expanded", "true");
    // No longer clamped when expanded.
    expect(screen.getByText(/A fact table contains/)).not.toHaveClass(
      "line-clamp-3",
    );
  });

  it("opens the full answer from View full answer", () => {
    const onViewFullAnswer = vi.fn();
    render(
      <SubmittedAnswerConfirmation
        status="submitted"
        answer={LONG_ANSWER}
        onViewFullAnswer={onViewFullAnswer}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.submission.view_full_answer"),
      }),
    );
    expect(onViewFullAnswer).toHaveBeenCalledTimes(1);
  });

  it("shows an Analyzing note in the processing state", () => {
    render(
      <SubmittedAnswerConfirmation status="processing" answer={LONG_ANSWER} />,
    );
    expect(
      screen.getByText(i18n.t("course_interview.submission.analyzing")),
    ).toBeInTheDocument();
  });

  it("shows an actionable failure with preserved-answer note and retry", () => {
    const onRetry = vi.fn();
    const onContinueEditing = vi.fn();
    render(
      <SubmittedAnswerConfirmation
        status="failed"
        answer={LONG_ANSWER}
        onRetry={onRetry}
        onContinueEditing={onContinueEditing}
      />,
    );
    expect(
      screen.getByText(i18n.t("course_interview.submission.failed_title")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("course_interview.submission.failed_preserved")),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.submission.try_again"),
      }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.submission.continue_editing"),
      }),
    );
    expect(onContinueEditing).toHaveBeenCalledTimes(1);
  });

  it("collapses to a single-line acknowledgement in the previous state", () => {
    render(
      <SubmittedAnswerConfirmation
        status="submitted"
        answer={LONG_ANSWER}
        previous
      />,
    );
    expect(
      screen.getByText(
        i18n.t("course_interview.submission.previous_submitted"),
      ),
    ).toBeInTheDocument();
    // The full preview is NOT rendered in the collapsed form.
    expect(screen.queryByText(/A fact table contains/)).not.toBeInTheDocument();
  });
});
