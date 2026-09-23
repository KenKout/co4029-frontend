import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionCardBody } from "../QuestionCardBody";
import type { InterviewQuestionAuthoring } from "@/lib/api/types";

/**
 * Save gating of the inline question editor (question-bank edit body).
 *
 * Pressing "Edit" seeds the draft from the saved question, so a teacher who
 * changes their mind mid-open sees a Save button that would do nothing. Save
 * stays disabled until an actual edit happened; a blank prompt keeps it
 * disabled even when dirty, since the server would reject it anyway.
 */

const Q = {
  id: "q-1",
  prompt_text: "Explain a database index",
  model_answer: "A B-tree structure that…",
} as unknown as InterviewQuestionAuthoring;

function renderBody(overrides: {
  editDirty?: boolean;
  editingText?: string;
  saving?: boolean;
}) {
  const handlers = {
    onCancelEdit: vi.fn(),
    onSaveEdit: vi.fn(),
    onChangeEditingText: vi.fn(),
    onChangeEditingAnswer: vi.fn(),
  };
  render(
    <QuestionCardBody
      q={Q}
      expanded={false}
      editing
      editingText={overrides.editingText ?? Q.prompt_text}
      editingAnswer="A B-tree structure that…"
      editDirty={overrides.editDirty ?? false}
      saving={overrides.saving ?? false}
      onCancelEdit={handlers.onCancelEdit}
      onSaveEdit={handlers.onSaveEdit}
      onChangeEditingText={handlers.onChangeEditingText}
      onChangeEditingAnswer={handlers.onChangeEditingAnswer}
    />,
  );
  return handlers;
}

describe("QuestionCardBody save gating", () => {
  it("disables Save right after opening the editor with no edits", () => {
    renderBody({ editDirty: false });
    expect(screen.getByRole("button", { name: /save|lưu/i })).toBeDisabled();
  });

  it("enables Save once there is an actual change", () => {
    renderBody({ editDirty: true });
    expect(screen.getByRole("button", { name: /save|lưu/i })).toBeEnabled();
  });

  it("keeps Save disabled when the prompt was cleared, even while dirty", () => {
    renderBody({ editDirty: true, editingText: "   " });
    expect(screen.getByRole("button", { name: /save|lưu/i })).toBeDisabled();
  });
});
