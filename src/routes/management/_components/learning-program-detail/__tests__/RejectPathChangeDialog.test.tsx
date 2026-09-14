import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RejectPathChangeDialog } from "../RejectPathChangeDialog";

const copy = vi.hoisted<Record<string, string>>(() => ({
  "management_learning_program_detail.reject.title": "Reject request?",
  "management_learning_program_detail.reject.description": "Choose a reason.",
  "management_learning_program_detail.reject.reason": "Reason category",
  "management_learning_program_detail.reject.other_reason": "Reason",
  "management_learning_program_detail.reject.note": "Note to the student",
  "management_learning_program_detail.reject.optional": "(optional)",
  "management_learning_program_detail.reject.other_reason_placeholder":
    "Enter another reason",
  "management_learning_program_detail.reject.optional_placeholder": "Add a note",
  "management_learning_program_detail.reject.reasons.documentation_missing.label":
    "Supporting information missing",
  "management_learning_program_detail.reject.reasons.documentation_missing.hint":
    "Required evidence was not provided.",
  "management_learning_program_detail.reject.reasons.other.label": "Other",
  "management_learning_program_detail.reject.reasons.other.hint":
    "Enter the reason below.",
  "management_learning_program_detail.actions.reject_request": "Reject request",
  "management_learning_program_detail.actions.rejecting": "Rejecting",
  "management_learning_program_detail.actions.cancel": "Cancel",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => copy[key] ?? key.split(".").at(-1) ?? key,
  }),
}));

function renderDialog(onReject = vi.fn()) {
  render(
    <RejectPathChangeDialog
      open
      onOpenChange={vi.fn()}
      studentName="Alex"
      isPending={false}
      onReject={onReject}
    />,
  );
  return onReject;
}

describe("RejectPathChangeDialog", () => {
  it("allows a predefined reason with an optional note", async () => {
    const user = userEvent.setup();
    const onReject = renderDialog();

    await user.click(screen.getByRole("radio", { name: /Supporting information missing/ }));
    await user.click(screen.getByRole("button", { name: "Reject request" }));

    expect(onReject).toHaveBeenCalledWith("documentation_missing", "", "");
  });

  it("requires a separate reason for Other while leaving the note optional", async () => {
    const user = userEvent.setup();
    const onReject = renderDialog();
    const submit = screen.getByRole("button", { name: "Reject request" });

    await user.click(screen.getByRole("radio", { name: /^Other/ }));
    expect(submit).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /^Reason/ }), "Policy exception");
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(onReject).toHaveBeenCalledWith("other", "Policy exception", "");
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("keeps the dialog within the viewport and enables vertical scrolling", () => {
    renderDialog();

    expect(screen.getByRole("alertdialog")).toHaveClass(
      "max-h-[calc(100dvh-2rem)]",
      "overflow-y-auto",
      "max-w-xl",
    );
  });
});
