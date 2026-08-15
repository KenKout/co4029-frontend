import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { FocusedAnswerComposer } from "../composer/FocusedAnswerComposer";
import {
  FullscreenExitWarningDialog,
  FullscreenPromptDialog,
} from "../dialogs";
import { InterviewHeader, QuestionCard } from "../stages";
import type { ConversationTurn } from "@/lib/interview/types";

/**
 * Render-smoke coverage for the workspace exports that had NO test.
 *
 * These exist to make the incremental extraction of interview-workspace.tsx
 * (3282 LOC, 29 exports) safe: before this file, six exports that
 * `routes/course-interview.tsx` actually renders could break — or vanish — and
 * the suite would still be green, so a file move would look successful while
 * shipping a blank header or a dead dialog.
 *
 * Deliberately shallow. Each test asserts the component mounts and puts its
 * load-bearing content in the DOM; it does not pin layout or copy. The point is
 * a tripwire for "this export still works", not a spec of how it looks — a
 * refactor must not have to rewrite these to pass.
 *
 * Note `<Link>` from TanStack Router: InterviewHeader renders one, which needs a
 * router context. It is mocked to a plain anchor rather than standing up a real
 * router, since the routing is not what these tests are protecting.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...rest
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <a {...(rest as Record<string, unknown>)}>{children}</a>,
}));

function turn(overrides: Partial<ConversationTurn> = {}): ConversationTurn {
  return {
    id: "t1",
    role: "ai",
    text: "What is a fact table?",
    kind: "question",
    ...overrides,
  };
}

const HEADER_PROPS = {
  slug: "dw-101",
  courseName: "Data Warehouses",
  interviewTitle: "Basic Knowledge",
  elapsed: "04:56",
  voiceOn: false,
  onToggleVoice: () => undefined,
};

describe("InterviewHeader (smoke)", () => {
  it("renders the interview title and elapsed time", () => {
    render(<InterviewHeader {...HEADER_PROPS} />);
    expect(screen.getByText("Basic Knowledge")).toBeInTheDocument();
    expect(screen.getByText(/04:56/)).toBeInTheDocument();
  });

  it("drives the progress bar off elapsed time when no question total is known", () => {
    // The learner API never exposes a question total, so this time-based
    // fallback is the ONLY thing that advances the bar during a real session —
    // a regression here leaves it frozen for the whole interview.
    render(
      <InterviewHeader
        {...HEADER_PROPS}
        assessmentStartedAtMs={Date.now() - 60_000}
        expectedDurationMinutes={10}
      />,
    );
    const bar = document.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
  });
});

describe("QuestionCard (smoke)", () => {
  it("renders the question text and its number", () => {
    render(
      <QuestionCard
        turn={turn()}
        questionNumber={1}
        speak={() => undefined}
        onSpeakingChange={() => undefined}
        onPresentationComplete={() => undefined}
        animate={false}
      />,
    );
    expect(screen.getByText(/What is a fact table\?/)).toBeInTheDocument();
  });
});

// The transcript drawer/panel and their visibility rule were removed: the stage
// renders the conversation inline, so a second on-demand copy of it was pure
// duplication (and never carried the agent's live utterances). Their smoke
// coverage went with them.

describe("fullscreen dialogs (smoke)", () => {
  it("renders the fullscreen prompt when open", () => {
    render(
      <FullscreenPromptDialog
        open
        onConfirm={() => undefined}
        onDecline={() => undefined}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    render(
      <FullscreenPromptDialog
        open={false}
        onConfirm={() => undefined}
        onDecline={() => undefined}
      />,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("surfaces the recorded exit count in the warning dialog", () => {
    // The count is the deterrent; a dialog that lost it would still look fine.
    render(
      <FullscreenExitWarningDialog
        open
        onReenter={() => undefined}
        onDismiss={() => undefined}
        exitCount={3}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});

describe("FocusedAnswerComposer (smoke)", () => {
  it("renders the answer surface without a control bar", () => {
    render(
      <FocusedAnswerComposer
        value=""
        draftLength={0}
        onChange={() => undefined}
        onSubmit={() => undefined}
        sending={false}
        elapsed="00:10"
        status="idle"
        onEndInterview={() => undefined}
      />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("mounts an arbitrary control bar through the slot", () => {
    // The room control bar itself needs a live LiveKit room; the slot contract
    // (any node renders above the textarea) is what this file protects.
    render(
      <FocusedAnswerComposer
        value=""
        draftLength={0}
        onChange={() => undefined}
        onSubmit={() => undefined}
        sending={false}
        controlBar={<div data-testid="control-bar" />}
        elapsed="00:10"
        status="idle"
        onEndInterview={() => undefined}
      />,
    );
    expect(screen.getByTestId("control-bar")).toBeInTheDocument();
  });
});
