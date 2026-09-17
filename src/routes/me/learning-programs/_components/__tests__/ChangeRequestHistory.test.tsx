import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PathChangeRequest } from "@/lib/api/types";
import { OpenChangeRequestBanner } from "../ChangeRequestHistory";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/format/date", () => ({
  useFormatDateTimeMedium: () => () => "2026-09-16",
}));

const request = {
  id: "request-1",
  status: "pending",
  reason: "I need to change direction",
  created_at: "2026-09-16T00:00:00Z",
  in_progress_at: null,
} as PathChangeRequest;

describe("OpenChangeRequestBanner", () => {
  it("requires confirmation before cancelling the request", () => {
    const onCancel = vi.fn();

    render(
      <OpenChangeRequestBanner
        request={request}
        isCancelling={false}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "my_learning_programs.requests.cancel",
      }),
    );

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "my_learning_programs.requests.confirm_cancel",
      }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
