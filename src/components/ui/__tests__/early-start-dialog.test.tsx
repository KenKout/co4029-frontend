import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EarlyStartDialog } from "../early-start-dialog";

describe("EarlyStartDialog", () => {
  it("requires the acknowledgement before starting", () => {
    const onConfirm = vi.fn();

    render(
      <EarlyStartDialog
        open
        onOpenChange={vi.fn()}
        courseTitle="Computer Architecture"
        onConfirm={onConfirm}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    const confirm = screen.getByRole("button", {
      name: /bắt đầu khóa học|start course/i,
    });

    expect(
      screen.getByText(/tôi hiểu và muốn bắt đầu khóa học|i understand and want to start the course/i),
    ).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    fireEvent.click(checkbox);
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
