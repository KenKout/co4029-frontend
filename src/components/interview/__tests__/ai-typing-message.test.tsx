import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiTypingMessage } from "../ai-typing-message";

describe("AiTypingMessage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds the question until narration starts, then releases it on the safety cap", async () => {
    vi.useFakeTimers();
    let markNarrationReady!: () => void;
    const speak = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          markNarrationReady = resolve;
        }),
    );

    render(<AiTypingMessage text="Hello" animate speak={speak} />);

    expect(speak).toHaveBeenCalledWith("Hello", { agentVoiced: true });
    expect(screen.getByRole("status")).toHaveTextContent(
      /đang chuẩn bị câu hỏi/i,
    );
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Text must not race ahead of the voice: past the minimum preparation
    // beat the question stays hidden while narration is still warming up.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();

    // The wait is a safety cap, not a hang: a narration that never starts
    // still releases the question so the candidate is never stuck.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_500);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/^H/)).toBeInTheDocument();

    await act(async () => {
      markNarrationReady();
      await Promise.resolve();
    });
  });

  it("finishes the ceremony only after text and audio playout complete", async () => {
    vi.useFakeTimers();
    let finishNarration!: () => void;
    const onComplete = vi.fn();
    const onTextComplete = vi.fn();
    const finished = new Promise<void>((resolve) => {
      finishNarration = resolve;
    });

    render(
      <AiTypingMessage
        text="Hello"
        animate
        presentationKind="opening"
        speak={() => ({ started: Promise.resolve(), finished })}
        onTextComplete={onTextComplete}
        onPresentationComplete={onComplete}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(onTextComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      finishNarration();
      await Promise.resolve();
    });
    expect(onTextComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("paces the final character to the narration duration", async () => {
    vi.useFakeTimers();
    const onTextComplete = vi.fn();

    render(
      <AiTypingMessage
        text="AB"
        animate
        speak={() => ({
          started: Promise.resolve(),
          finished: new Promise<void>(() => undefined),
          durationMs: Promise.resolve(2_000),
        })}
        onTextComplete={onTextComplete}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_900);
    });
    expect(screen.queryByText("AB")).not.toBeInTheDocument();
    expect(onTextComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(screen.getByText("AB")).toBeInTheDocument();
    expect(onTextComplete).toHaveBeenCalledTimes(1);
  });
});
