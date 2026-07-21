import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { InterviewProgressSteps } from "../interview-progress-steps";
import { SetupChecklist } from "../setup-checklist";
import { ErrorBanner, ConnectionLostBanner } from "../error-banner";

// TanStack Router's <Link> needs a router context; stub it for isolated tests.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/profile">{children}</a>
  ),
}));

// The test env may run in either locale; assert against resolved i18n strings
// rather than hard-coded English so it passes regardless of active language.
const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

describe("InterviewProgressSteps", () => {
  it("marks the current step with aria-current and renders three steps", () => {
    render(<InterviewProgressSteps current="interview" />);
    const list = screen.getByRole("list");
    expect(list.querySelectorAll("li")).toHaveLength(3);
    const current = list.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toContain(
      tr("course_interview.steps.interview"),
    );
  });
});

describe("SetupChecklist", () => {
  const baseProps = {
    candidateName: "Ada Lovelace",
    language: "en" as const,
    onLanguageChange: () => undefined,
    onAction: vi.fn(),
  };

  it("shows the candidate name and confirm action on the identity step", () => {
    const onAction = vi.fn();
    render(
      <SetupChecklist {...baseProps} stage="identity_check" onAction={onAction} />,
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    const confirm = screen.getByRole("button", {
      name: tr("course_interview.onboarding.confirm_identity"),
    });
    fireEvent.click(confirm);
    expect(onAction).toHaveBeenCalledWith("confirm_identity");
  });

  it("fires the ready action from the readiness step", () => {
    const onAction = vi.fn();
    render(
      <SetupChecklist {...baseProps} stage="readiness" onAction={onAction} />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: tr("course_interview.onboarding.ready"),
      }),
    );
    expect(onAction).toHaveBeenCalledWith("ready");
  });

  it("reports an unavailable microphone without losing the row", () => {
    render(
      <SetupChecklist {...baseProps} stage="audio_check" micConnected={false} />,
    );
    expect(
      screen.getByText(tr("course_interview.setup.mic_unavailable")),
    ).toBeInTheDocument();
  });
});

describe("ErrorBanner", () => {
  it("announces errors assertively and wires the recovery action", () => {
    const onRetry = vi.fn();
    render(
      <ErrorBanner
        severity="error"
        title="Submission failed"
        reassurance="Your response is preserved."
        actions={[{ label: "Try again", onClick: onRetry, primary: true }]}
      />,
    );
    const region = screen.getByRole("alert");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText("Your response is preserved.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("ConnectionLostBanner offers reconnect when offline and is calmer while reconnecting", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ConnectionLostBanner onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: tr("course_interview.recovery.reconnect"),
      }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ConnectionLostBanner reconnecting onRetry={onRetry} />);
    // While reconnecting it downgrades to a polite status (no action needed).
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
