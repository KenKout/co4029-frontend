import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/profile">{children}</a>
  ),
}));

import { FocusedAnswerComposer } from "../composer/FocusedAnswerComposer";
import { OnboardingActions } from "../onboarding-actions";
import {
  ConversationMessage,
  MessageTurnActions,
  UserTypingIndicator,
  VoiceStatusIndicator,
} from "../conversation";
import {
  EndConfirmationPanel,
  EndInterviewDialog,
  LeaveInterviewDialog,
  StartInterviewDialog,
} from "../dialogs";
import {
  FocusedInterviewStage,
  InterviewHeader,
  QuestionCard,
} from "../stages";
import {
  formatRelativeInterviewTime,
  resolveInterviewState,
} from "@/lib/interview/format";
import { useInterviewTimer } from "@/lib/interview/use-interview-timer";
import { SubmittedAnswerConfirmation } from "../submitted-answer-confirmation";

describe("formatRelativeInterviewTime", () => {
  it("formats transcript timestamps relative to interview start", () => {
    expect(formatRelativeInterviewTime(0)).toBe("0:00");
    expect(formatRelativeInterviewTime(65)).toBe("1:05");
    expect(formatRelativeInterviewTime(3661)).toBe("1:01:01");
  });
});

describe("ConversationMessage timestamps", () => {
  it("omits onboarding timestamps and shows them after assessment start", () => {
    const commonProps = {
      label: null,
      isLatest: false,
      speak: () => undefined,
      onTick: () => undefined,
      onSpeakingChange: () => undefined,
    };
    const { rerender } = render(
      <ConversationMessage
        {...commonProps}
        turn={{ id: "greeting", role: "ai", text: "Welcome", kind: "opening" }}
      />,
    );

    expect(screen.queryByText("0:00")).not.toBeInTheDocument();

    rerender(
      <ConversationMessage
        {...commonProps}
        turn={{
          id: "question",
          role: "ai",
          text: "Question one",
          kind: "question",
          elapsedSeconds: 0,
        }}
      />,
    );
    const timestamp = screen.getByText("0:00");
    expect(timestamp).toBeInTheDocument();
    expect(timestamp.parentElement?.parentElement).toHaveClass("w-full");
  });

  it("shows the AI timestamp only after the typewriter text is complete", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <ConversationMessage
        turn={{
          id: "typing-question",
          role: "ai",
          text: "Hi",
          kind: "question",
          elapsedSeconds: 0,
        }}
        label={null}
        isLatest
        speak={() => ({
          started: Promise.resolve(),
          finished: new Promise<void>(() => undefined),
        })}
        onTick={() => undefined}
        onSpeakingChange={() => undefined}
      />,
    );

    expect(screen.queryByText("0:00")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    unmount();
    vi.useRealTimers();
  });
});

describe("ConversationMessage replay", () => {
  it("hides replay until presentation completion, then enables it", () => {
    const onReplay = vi.fn();
    const commonProps = {
      turn: { id: "ai-message", role: "ai" as const, text: "Welcome" },
      label: null,
      isLatest: false,
      speak: () => undefined,
      onTick: () => undefined,
      onSpeakingChange: () => undefined,
      onReplay,
    };
    const { rerender } = render(
      <ConversationMessage
        {...commonProps}
        replayVisible={false}
        replayDisabled
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <ConversationMessage
        {...commonProps}
        replayVisible
        replayDisabled={false}
      />,
    );
    const replayButton = screen.getByRole("button");
    expect(replayButton).toBeEnabled();
    fireEvent.click(replayButton);
    expect(onReplay).toHaveBeenCalledTimes(1);
  });
});

describe("MessageTurnActions", () => {
  it("animates choices into and out of the AI message", async () => {
    const { rerender } = render(
      <MessageTurnActions visible={false}>
        <button type="button">Quick response</button>
      </MessageTurnActions>,
    );
    expect(
      screen.queryByRole("button", { name: "Quick response" }),
    ).not.toBeInTheDocument();

    rerender(
      <MessageTurnActions visible>
        <button type="button">Quick response</button>
      </MessageTurnActions>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Quick response" }),
      ).toBeVisible(),
    );

    rerender(
      <MessageTurnActions visible={false}>
        <button type="button">Quick response</button>
      </MessageTurnActions>,
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Quick response" }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("UserTypingIndicator", () => {
  it("announces that the candidate is typing", () => {
    render(<UserTypingIndicator />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /người dùng đang nhập/i,
    );
  });
});

function renderComposer(value: string, onSubmit = vi.fn()) {
  render(
    <FocusedAnswerComposer
      value={value}
      draftLength={value.length}
      onChange={() => undefined}
      onSubmit={onSubmit}
      sending={false}
      elapsed="00:12"
      status="idle"
      onEndInterview={() => undefined}
    />,
  );
  return onSubmit;
}

describe("FocusedAnswerComposer", () => {
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

  it("renders the send hint as keycaps, not a sentence", () => {
    // Redesign: each key is its own <kbd> so the shortcut is scannable. Enter
    // appears twice (send, and again in the Shift combo), Shift once.
    renderComposer("");
    const keys = Array.from(document.querySelectorAll("kbd")).map((k) =>
      (k.textContent ?? "").trim(),
    );
    expect(keys).toEqual(["Enter", "Shift", "Enter"]);
  });

  it("keeps the shortcut announceable as a sentence", () => {
    // The keycaps are aria-hidden, so without this label a screen reader would
    // get "Enter send Shift + Enter new line" as loose fragments — worse than
    // the prose it replaced.
    renderComposer("");
    expect(
      screen.getByLabelText(/Enter để gửi.*Shift \+ Enter để xuống dòng/i),
    ).toBeInTheDocument();
  });

  it("labels the keys with verbs only", () => {
    // "Enter to send" collapses to a keycap + "gửi"; the word "Enter" must not
    // also appear as prose next to its own keycap.
    renderComposer("");
    const hint = screen.getByLabelText(/Enter để gửi/i);
    const visibleText = (hint.textContent ?? "").replace(
      /Enter|Shift|\+|·/g,
      "",
    );
    expect(visibleText.trim()).toMatch(/gửi/);
    expect(visibleText.trim()).toMatch(/xuống dòng/);
  });

  it("does not send an empty answer", () => {
    const onSubmit = renderComposer("   ");
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /gửi câu trả lời/i }),
    ).toBeDisabled();
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

describe("EndConfirmationPanel", () => {
  it("renders the confirmation prompt and both actions", () => {
    render(
      <EndConfirmationPanel
        prompt="Xác nhận kết thúc?"
        onContinue={() => undefined}
        onEndAndSubmit={() => undefined}
        isPending={false}
      />,
    );
    expect(screen.getByText("Xác nhận kết thúc?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /tiếp tục phỏng vấn/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /kết thúc và nộp/i }),
    ).toBeEnabled();
  });

  it("wires continue and end-and-submit callbacks", () => {
    const onContinue = vi.fn();
    const onEndAndSubmit = vi.fn();
    render(
      <EndConfirmationPanel
        prompt="?"
        onContinue={onContinue}
        onEndAndSubmit={onEndAndSubmit}
        isPending={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /tiếp tục phỏng vấn/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /kết thúc và nộp/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onEndAndSubmit).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while a confirmation reply is pending", () => {
    render(
      <EndConfirmationPanel
        prompt="?"
        onContinue={() => undefined}
        onEndAndSubmit={() => undefined}
        isPending
      />,
    );
    expect(
      screen.getByRole("button", { name: /tiếp tục phỏng vấn/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /đang kết thúc/i }),
    ).toBeDisabled();
  });
});

describe("LeaveInterviewDialog", () => {
  it("explains that setup resumes in the same attempt", () => {
    render(
      <LeaveInterviewDialog
        open
        assessmentStarted={false}
        hasTimeLimit
        onStay={() => undefined}
        onLeave={() => undefined}
      />,
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /cùng lượt làm trong một khoảng thời gian không hoạt động/i,
    );
  });

  it("warns that the assessed timer continues while away", () => {
    render(
      <LeaveInterviewDialog
        open
        assessmentStarted
        hasTimeLimit
        onStay={() => undefined}
        onLeave={() => undefined}
      />,
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /đồng hồ phỏng vấn vẫn tiếp tục chạy/i,
    );
  });
});

describe("StartInterviewDialog", () => {
  it("asks for confirmation before starting the session", () => {
    render(
      <StartInterviewDialog
        open
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        isPending={false}
      />,
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/bạn chắc chắn muốn bắt đầu/i);
    expect(
      screen.getByRole("button", { name: /bắt đầu phỏng vấn/i }),
    ).toBeEnabled();
    // Short on purpose: this is a confirmation, not a briefing. The old copy
    // listed identity/audio/language/readiness plus the voice default and ran
    // five lines on a phone. Keep the one fact worth knowing before committing —
    // that the graded clock has not started — and nothing else.
    expect(dialog).toHaveTextContent(/đồng hồ chấm điểm chỉ bắt đầu/i);
    expect(dialog.textContent ?? "").not.toMatch(/danh tính|ngôn ngữ/i);
    expect(
      screen.getByRole("button", { name: /^quay lại$/i }),
    ).toBeInTheDocument();
  });

  it("uses continuation copy for an active attempt", () => {
    render(
      <StartInterviewDialog
        open
        isResume
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
        isPending={false}
      />,
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /không tạo lượt làm mới/i,
    );
    expect(
      screen.getByRole("button", { name: /tiếp tục lượt trước/i }),
    ).toBeEnabled();
  });
});

describe("OnboardingActions", () => {
  it("offers one matching quick response for each short setup turn", () => {
    const onAction = vi.fn();
    const onLanguageChange = vi.fn();
    const { rerender } = render(
      <OnboardingActions
        stage="identity_check"
        language="en"
        onLanguageChange={onLanguageChange}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /đúng là tôi/i }));
    expect(onAction).toHaveBeenLastCalledWith("confirm_identity");

    rerender(
      <OnboardingActions
        stage="audio_check"
        language="en"
        onLanguageChange={onLanguageChange}
        onAction={onAction}
      />,
    );
    const audioClearButton = screen.getByRole("button", {
      name: /tôi nghe rõ/i,
    });
    expect(audioClearButton.parentElement).toHaveClass("justify-start");
    expect(audioClearButton.parentElement).not.toHaveClass("justify-end");
    fireEvent.click(audioClearButton);
    expect(onAction).toHaveBeenLastCalledWith("audio_clear");

    rerender(
      <OnboardingActions
        stage="language_check"
        language="en"
        onLanguageChange={onLanguageChange}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^english$/i }));
    expect(onLanguageChange).toHaveBeenLastCalledWith("en");
    expect(onAction).toHaveBeenLastCalledWith("confirm_language", "en");
  });

  it("does not start the assessment until readiness is confirmed", () => {
    const onAction = vi.fn();
    render(
      <OnboardingActions
        stage="readiness"
        language="vi"
        onLanguageChange={() => undefined}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /chưa sẵn sàng/i }));
    expect(onAction).toHaveBeenLastCalledWith("not_ready");

    fireEvent.click(screen.getByRole("button", { name: /bắt đầu phỏng vấn/i }));
    expect(onAction).toHaveBeenLastCalledWith("ready");
  });
});

describe("P0 focused interview room", () => {
  it("keeps the current question visible and reveals progressive assistance actions", async () => {
    vi.useFakeTimers();
    const onHint = vi.fn();
    const onExplainTerm = vi.fn();
    const transcript = [
      {
        id: "question",
        role: "ai" as const,
        text: "Compare fact tables and factless fact tables.",
        kind: "question" as const,
        questionType: "technical",
      },
      {
        id: "clarification-request",
        role: "user" as const,
        text: "Could you clarify this question, please?",
        kind: "clarification" as const,
      },
      {
        id: "clarification-response",
        role: "ai" as const,
        text: "Put another way, describe what the table types share and how they differ.",
        kind: "clarification" as const,
      },
    ];

    const { unmount } = render(
      <FocusedInterviewStage
        transcript={transcript}
        status="idle"
        assessmentActive
        currentQuestionNumber={1}
        totalQuestions={null}
        currentQuestionType="technical"
        isUserTyping={false}
        questionTypeLabel={() => "Technical"}
        speak={() => undefined}
        onSpeakingChange={() => undefined}
        onRequestHint={onHint}
        onExplainTerm={onExplainTerm}
      />,
    );

    expect(
      screen.getByText("Compare fact tables and factless fact tables."),
    ).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(
      screen.getByText(
        "Put another way, describe what the table types share and how they differ.",
      ),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.give_small_hint"),
      }),
    );
    expect(onHint).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.explain_term"),
      }),
    );
    const input = screen.getByLabelText(
      i18n.t("course_interview.workspace.term_input_label"),
    );
    fireEvent.change(input, { target: { value: "factless fact tables" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.explain"),
      }),
    );
    expect(onExplainTerm).toHaveBeenCalledWith("factless fact tables");

    unmount();
    vi.useRealTimers();
  });

  it("keeps the hint control live across the ladder and closes it at the cap", async () => {
    // The server grants MAX_HINTS_PER_QUESTION escalating hints per question and
    // resets the ladder on advance. A boolean "hintUsed" used to disable this
    // control after the FIRST hint, so the harder rungs were unreachable through
    // the UI. Drive it with real hint turns and assert the control tracks them.
    vi.useFakeTimers();
    const onHint = vi.fn();
    const question = {
      id: "question",
      role: "ai" as const,
      text: "Compare fact tables and factless fact tables.",
      kind: "question" as const,
      questionType: "technical",
    };
    const hintTurn = (n: number) => ({
      id: `hint-${n}`,
      role: "ai" as const,
      text: `Hint number ${n}.`,
      kind: "hint" as const,
    });
    const props = {
      status: "idle" as const,
      assessmentActive: true,
      currentQuestionNumber: 1,
      totalQuestions: null,
      currentQuestionType: "technical",
      isUserTyping: false,
      questionTypeLabel: () => "Technical",
      speak: () => undefined,
      onSpeakingChange: () => undefined,
      onRequestHint: onHint,
    };

    const settle = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
    };

    const hintButton = () =>
      screen.getByRole("button", {
        name: new RegExp(
          i18n.t("course_interview.workspace.give_small_hint"),
          "i",
        ),
      });

    // The rail lives on the assistance card, so it only exists once at least one
    // assistance turn (here: the first hint) is on screen.
    const { rerender, unmount } = render(
      <FocusedInterviewStage {...props} transcript={[question]} />,
    );
    await settle();

    // Rungs 1 and 2 spent: still more ladder left, so the control stays usable.
    for (const spent of [1, 2]) {
      rerender(
        <FocusedInterviewStage
          {...props}
          transcript={[
            question,
            ...Array.from({ length: spent }, (_, i) => hintTurn(i + 1)),
          ]}
        />,
      );
      await settle();
      expect(hintButton()).toBeEnabled();
    }

    // Cap reached: the control reports the ladder is spent and goes disabled.
    rerender(
      <FocusedInterviewStage
        {...props}
        transcript={[question, hintTurn(1), hintTurn(2), hintTurn(3)]}
      />,
    );
    await settle();
    const spentButton = screen.getByRole("button", {
      name: new RegExp(i18n.t("course_interview.workspace.hint_provided"), "i"),
    });
    expect(spentButton).toBeDisabled();

    unmount();
    vi.useRealTimers();
  });

  it("renders the active prompt as a prominent question card", async () => {
    vi.useFakeTimers();
    const onPresented = vi.fn();
    const { unmount } = render(
      <QuestionCard
        turn={{
          id: "question-card",
          role: "ai",
          text: "Explain database normalization.",
          kind: "question",
          questionType: "technical",
        }}
        questionNumber={2}
        totalQuestions={8}
        category="Technical"
        speak={() => undefined}
        onSpeakingChange={() => undefined}
        onPresentationComplete={onPresented}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Explain database normalization.",
    );
    expect(
      screen.getByText(
        i18n.t("course_interview.workspace.question_of", {
          current: 2,
          total: 8,
        }),
      ),
    ).toBeInTheDocument();
    expect(onPresented).toHaveBeenCalledTimes(1);
    unmount();
    vi.useRealTimers();
  });

  it("renders known question progress and elapsed/expected time", () => {
    render(
      <InterviewHeader
        slug="data-course"
        courseName="Data Engineering"
        interviewTitle="Technical interview"
        elapsed="07:19"
        expectedDurationMinutes={30}
        currentQuestion={2}
        totalQuestions={8}
        connected
        voiceOn
        onToggleVoice={() => undefined}
      />,
    );

    expect(screen.getByText("Câu hỏi 2 / 8")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(screen.getByText("07:19 / 30:00")).toBeInTheDocument();
  });

  it("uses an indeterminate progress fallback when the total is unavailable", () => {
    render(
      <InterviewHeader
        slug="data-course"
        courseName="Data Engineering"
        interviewTitle="Technical interview"
        elapsed="00:12"
        currentQuestion={3}
        totalQuestions={null}
        connected
        voiceOn
        onToggleVoice={() => undefined}
      />,
    );

    expect(screen.getByText("Câu hỏi 3")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).not.toHaveAttribute(
      "aria-valuemax",
    );
  });

  it("keeps the interview timer anchored across rerenders", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T00:00:10Z"));
    const startedAt = Date.now() - 10_000;

    function TimerHarness({ marker }: { marker: string }) {
      const value = useInterviewTimer(true, startedAt);
      return <output data-marker={marker}>{value}</output>;
    }

    const { rerender, unmount } = render(<TimerHarness marker="first" />);
    expect(screen.getByText("00:10")).toBeInTheDocument();
    rerender(<TimerHarness marker="second" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByText("00:12")).toBeInTheDocument();
    unmount();
    vi.useRealTimers();
  });

  it("announces every primary interview state", () => {
    const statuses = [
      "idle",
      "speaking",
      "listening",
      "thinking",
      "paused",
      "error",
      "disconnected",
    ] as const;
    const { rerender } = render(<VoiceStatusIndicator status="idle" />);

    statuses.forEach((status) => {
      rerender(<VoiceStatusIndicator status={status} />);
      expect(screen.getByRole("status")).toHaveTextContent(
        i18n.t(`course_interview.workspace.status.${status}`),
      );
    });
  });

  it("resolves conflicting runtime signals to one primary state", () => {
    expect(resolveInterviewState({ speaking: true, listening: true })).toBe(
      "speaking",
    );
    expect(
      resolveInterviewState({
        thinking: true,
        speaking: true,
        listening: true,
      }),
    ).toBe("thinking");
    expect(resolveInterviewState({ connected: false, thinking: true })).toBe(
      "disconnected",
    );
  });

  it("prevents duplicate submission while an answer is being analyzed", () => {
    const onSubmit = vi.fn();
    render(
      <FocusedAnswerComposer
        value="A complete answer"
        draftLength={17}
        onChange={() => undefined}
        onSubmit={onSubmit}
        sending
        elapsed="00:10"
        status="thinking"
        onEndInterview={() => undefined}
      />,
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: i18n.t("course_interview.actions.sending"),
      }),
    ).toBeDisabled();
  });

  it("presents response choices after each consecutive onboarding question", async () => {
    vi.useFakeTimers();
    const firstTurn = {
      id: "identity-question",
      role: "ai" as const,
      text: "Can you confirm your name?",
      kind: "opening" as const,
    };
    const secondTurn = {
      id: "audio-question",
      role: "ai" as const,
      text: "Thank you. Can you hear me clearly?",
      kind: "opening" as const,
    };
    const commonProps = {
      status: "idle" as const,
      assessmentActive: false,
      currentQuestionNumber: 1,
      totalQuestions: null,
      isUserTyping: false,
      questionTypeLabel: () => null,
      speak: () => undefined,
      onSpeakingChange: () => undefined,
      activeTurnActionsVisible: true,
    };

    const { rerender, unmount } = render(
      <FocusedInterviewStage
        {...commonProps}
        transcript={[firstTurn]}
        activeTurnActions={<button type="button">Confirm identity</button>}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(
      screen.getByRole("button", { name: "Confirm identity" }),
    ).toBeVisible();

    rerender(
      <FocusedInterviewStage
        {...commonProps}
        transcript={[
          firstTurn,
          { id: "identity-answer", role: "user", text: "Yes", kind: "answer" },
          secondTurn,
        ]}
        activeTurnActions={<button type="button">Audio is clear</button>}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    // The turn text appears twice: once in the sr-only aria-live announcement
    // region (accessibility) and once as the visible question. Assert the
    // visible one specifically rather than failing on the intentional duplicate.
    const matches = screen.getAllByText("Thank you. Can you hear me clearly?");
    expect(matches.some((el) => !el.classList.contains("sr-only"))).toBe(true);
    expect(
      screen.getByRole("button", { name: "Audio is clear" }),
    ).toBeVisible();
    unmount();
    vi.useRealTimers();
  });

  it("renders a compact submission confirmation as a secondary element, not a chat bubble", async () => {
    vi.useFakeTimers();
    const onView = vi.fn();
    const transcript = [
      {
        id: "question",
        role: "ai" as const,
        text: "Compare fact tables and factless fact tables.",
        kind: "question" as const,
        questionType: "technical",
      },
    ];

    const { unmount } = render(
      <FocusedInterviewStage
        transcript={transcript}
        status="thinking"
        assessmentActive
        currentQuestionNumber={1}
        totalQuestions={null}
        currentQuestionType="technical"
        isUserTyping={false}
        questionTypeLabel={() => "Technical"}
        speak={() => undefined}
        onSpeakingChange={() => undefined}
        submissionSlot={
          <SubmittedAnswerConfirmation
            status="submitted"
            answer={"A fact table stores measurable business events. ".repeat(
              6,
            )}
            onViewFullAnswer={onView}
          />
        }
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(
      screen.getByText(i18n.t("course_interview.submission.submitted_title")),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.submission.view_full_answer"),
      }),
    );
    expect(onView).toHaveBeenCalledTimes(1);
    unmount();
    vi.useRealTimers();
  });
});
