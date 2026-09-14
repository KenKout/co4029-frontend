import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { sampleUser, server } from "@/test/msw-handlers";
import { AddToCuratedBankButton } from "../AddToCuratedBankDialog";

describe("bulk add to curated bank", () => {
  it("closes the confirmation and clears selection after a successful copy", async () => {
    const onCleared = vi.fn();
    localStorage.setItem("abridgeai.access_token", "test-access-token");
    localStorage.setItem("abridgeai.refresh_token", "test-refresh-token");
    localStorage.setItem(
      "abridgeai.access_token_expires_at",
      String(Date.now() + 3_600_000),
    );
    localStorage.setItem("abridgeai.user", JSON.stringify(sampleUser));
    server.use(
      http.post(
        "http://localhost:8000/api/v1/teacher/courses/course-1/quiz-question-bank/from-questions",
        () => HttpResponse.json({ created: [], skipped: ["q-1", "q-2"] }),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={client}>
        <AddToCuratedBankButton
          courseId="course-1"
          ids={["q-1", "q-2"]}
          onCleared={onCleared}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add to bank" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Add 2 questions to curated bank?")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Add to bank" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onCleared).toHaveBeenCalledOnce();
  });
});
