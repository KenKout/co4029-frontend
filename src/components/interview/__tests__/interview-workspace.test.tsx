import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/profile">{children}</a>,
}));

import {
  AnswerComposer,
  ConversationMessage,
  EndInterviewDialog,
  AnswerControls,
  FocusedAnswerComposer,
  FocusedInterviewStage,
  InterviewHeader,
  LeaveInterviewDialog,
  MessageTurnActions,
  OnboardingActions,
  StartInterviewDialog,
  QuestionCard,
  TranscriptDrawer,
  UserTypingIndicator,
  VoiceStatusIndicator,
  formatRelativeInterviewTime,
  resolveInterviewState,
  useInterviewTimer,
} from "../interview-workspace";

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
      <ConversationMessage {...commonProps} replayVisible={false} replayDisabled />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <ConversationMessage {...commonProps} replayVisible replayDisabled={false} />,
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
    expect(screen.queryByRole("button", { name: "Quick response" })).not.toBeInTheDocument();

    rerender(
      <MessageTurnActions visible>
        <button type="button">Quick response</button>
      </MessageTurnActions>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quick response" })).toBeVisible(),
    );

    rerender(
      <MessageTurnActions visible={false}>
        <button type="button">Quick response</button>
      </MessageTurnActions>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Quick response" })).not.toBeInTheDocument(),
    );
  });
});

describe("UserTypingIndicator", () => {
  it("announces that the candidate is typing", () => {
    render(<UserTypingIndicator />);

    expect(screen.getByRole("status")).toHaveTextContent(/người dùng đang nhập/i);
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
      status="idle"
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

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /tham gia bước chuẩn bị phỏng vấn/i,
    );
    expect(
      screen.getByRole("button", { name: /bắt đầu phỏng vấn/i }),
    ).toBeEnabled();
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
    const audioClearButton = screen.getByRole("button", { name: /tôi nghe rõ/i });
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
        transcriptOpen={false}
        onTranscriptOpenChange={() => undefined}
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

    expect(screen.getByText("Compare fact tables and factless fact tables.")).toBeVisible();

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
        onReplay={() => undefined}
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
    expect(screen.getByText(i18n.t("course_interview.workspace.question_of", {
      current: 2,
      total: 8,
    }))).toBeInTheDocument();
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
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
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
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuemax");
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
    expect(
      resolveInterviewState({ speaking: true, listening: true }),
    ).toBe("speaking");
    expect(
      resolveInterviewState({ thinking: true, speaking: true, listening: true }),
    ).toBe("thinking");
    expect(
      resolveInterviewState({ connected: false, thinking: true }),
    ).toBe("disconnected");
  });

  it("supports start, pause, resume, and finish recording controls", () => {
    const onStart = vi.fn();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onFinish = vi.fn();
    const common = {
      mode: "voice" as const,
      onModeChange: () => undefined,
      micAvailable: true,
      micError: null,
      disabled: false,
      canFinish: true,
      onStart,
      onPause,
      onResume,
      onFinish,
      onCancel: () => undefined,
    };
    const { rerender } = render(
      <AnswerControls {...common} micActive={false} micPaused={false} />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.start_answering"),
      }),
    );
    expect(onStart).toHaveBeenCalledTimes(1);

    rerender(<AnswerControls {...common} micActive micPaused={false} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.pause_recording"),
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.finish_answer"),
      }),
    );
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);

    rerender(<AnswerControls {...common} micActive={false} micPaused />);
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.resume_recording"),
      }),
    );
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("preserves the answer while switching between Type and Voice modes", () => {
    function ComposerHarness() {
      const [value, setValue] = useState("");
      return (
        <FocusedAnswerComposer
          value={value}
          draftLength={value.length}
          onChange={setValue}
          onSubmit={() => undefined}
          onFinishRecording={() => undefined}
          sending={false}
          micAvailable
          micActive={false}
          onMicStart={() => undefined}
          onMicPause={() => undefined}
          onMicResume={() => undefined}
          onMicCancel={() => undefined}
          transcriptOpen={false}
          onTranscriptToggle={() => undefined}
          elapsed="00:10"
          status="idle"
          onEndInterview={() => undefined}
        />
      );
    }

    render(<ComposerHarness />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "My preserved answer" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.voice_mode"),
      }),
    );
    expect(screen.getByRole("textbox")).toHaveValue("My preserved answer");
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.type_mode"),
      }),
    );
    expect(screen.getByRole("textbox")).toHaveValue("My preserved answer");
  });

  it("prevents duplicate submission while an answer is being analyzed", () => {
    const onSubmit = vi.fn();
    render(
      <FocusedAnswerComposer
        value="A complete answer"
        draftLength={17}
        onChange={() => undefined}
        onSubmit={onSubmit}
        onFinishRecording={onSubmit}
        sending
        micAvailable={false}
        micActive={false}
        onMicStart={() => undefined}
        onMicPause={() => undefined}
        onMicResume={() => undefined}
        onMicCancel={() => undefined}
        transcriptOpen={false}
        onTranscriptToggle={() => undefined}
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

  it("keeps history collapsed by default and restores focus after Escape", async () => {
    function TranscriptHarness() {
      const [open, setOpen] = useState(false);
      return (
        <TranscriptDrawer
          open={open}
          onOpenChange={setOpen}
          transcript={[
            { id: "prior", role: "user", text: "A prior answer", kind: "answer" },
          ]}
          questionTypeLabel={() => null}
          speak={() => undefined}
          onSpeakingChange={() => undefined}
          onReplay={() => undefined}
          replayDisabled={false}
          replayingTurnId={null}
        />
      );
    }

    render(<TranscriptHarness />);
    const trigger = screen.getByRole("button", {
      name: new RegExp(i18n.t("course_interview.workspace.view_transcript"), "i"),
    });
    expect(screen.queryByText("A prior answer")).not.toBeInTheDocument();
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByText("A prior answer")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("A prior answer")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("shows an actionable microphone permission recovery", () => {
    const onRetry = vi.fn();
    render(
      <AnswerControls
        mode="voice"
        onModeChange={() => undefined}
        micAvailable
        micActive={false}
        micPaused={false}
        micError="permission-denied"
        canFinish={false}
        onStart={() => undefined}
        onPause={() => undefined}
        onResume={() => undefined}
        onFinish={() => undefined}
        onCancel={() => undefined}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/micrô/i);
    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("course_interview.workspace.retry_microphone"),
      }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
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
      transcriptOpen: false,
      onTranscriptOpenChange: () => undefined,
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
    expect(screen.getByRole("button", { name: "Confirm identity" })).toBeVisible();

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
    expect(screen.getByText("Thank you. Can you hear me clearly?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Audio is clear" })).toBeVisible();
    unmount();
    vi.useRealTimers();
  });
});
