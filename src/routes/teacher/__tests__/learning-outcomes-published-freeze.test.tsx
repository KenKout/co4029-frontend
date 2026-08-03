import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { server } from "@/test/msw-handlers";
import { LearningOutcomes } from "@/routes/teacher/_components/learning-outcomes";
import type { InterviewOutcomeAuthoring } from "@/lib/api/types";

/**
 * Learning outcomes freeze on a published config.
 *
 * The outcomes ARE the grading criteria — the AI judges each answer against
 * them and weights the result by importance_weight. The backend now refuses
 * outcome mutations on a published config (409 interview_published_setting_locked,
 * like the settings freeze); these tests pin the UI half: on "published" every
 * control that would mutate outcomes is genuinely disabled, and on a draft it
 * is not. The wiring (status → frozen → disabled props) is what can silently
 * rot, so it is asserted through the real component, not the pieces.
 */

const OUTCOME: InterviewOutcomeAuthoring = {
  id: "11111111-1111-1111-1111-111111111111",
  interview_config_id: "00000000-0000-0000-0000-000000000001",
  position: 1,
  outcome_text: "Explain database indexing",
  outcome_type: "knowledge",
  importance_weight: 3,
  created_by: "00000000-0000-0000-0000-000000000002",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderPanel(status: string | null) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // The panel queries course-level outcomes for the import affordance; MSW
  // fails unhandled requests, so serve the empty list here.
  server.use(
    http.get(
      "http://localhost:8000/api/v1/teacher/courses/:courseId/outcomes",
      () => HttpResponse.json([]),
    ),
  );
  return render(
    <QueryClientProvider client={qc}>
      <LearningOutcomes
        configId="00000000-0000-0000-0000-000000000001"
        courseId="00000000-0000-0000-0000-000000000002"
        outcomes={[OUTCOME]}
        questions={[]}
        minOutcomesToPass={1}
        onViewQuestions={() => undefined}
        status={status}
      />
    </QueryClientProvider>,
  );
}

describe("LearningOutcomes published freeze", () => {
  it("disables the weight stepper on a published config", () => {
    renderPanel("published");
    expect(
      screen.getByRole("button", { name: /Giảm trọng số|Decrease weight/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Tăng trọng số|Increase weight/i }),
    ).toBeDisabled();
  });

  it("dims the whole section and shows a lock on a published config", () => {
    renderPanel("published");
    // The section is blurred/dimmed (opacity-60) exactly like the frozen
    // settings cards, so a locked panel reads as locked rather than broken.
    const heading = screen.getByRole("heading", {
      name: /Chuẩn đầu ra|Learning outcomes/i,
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveClass("opacity-60");
    expect(section).toHaveAttribute("title");
    // The heading carries the lock affordance next to its label.
    expect(heading.querySelector("svg.lucide-lock")).not.toBeNull();
  });

  it("disables the delete action on a published config", async () => {
    const user = userEvent.setup();
    renderPanel("published");
    // Open the row's actions menu, then the remove item must be disabled.
    await user.click(
      screen.getByRole("button", {
        name: /Thêm hành động|More actions/i,
      }),
    );
    const remove = await screen.findByRole("menuitem", {
      name: /Bỏ khỏi phỏng vấn|Remove from interview/i,
    });
    // base-ui renders aria-disabled (not the native attribute) on a disabled
    // DropdownMenuItem — but the click must be blocked either way.
    expect(remove).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the weight stepper enabled on a draft", () => {
    renderPanel("draft");
    expect(
      screen.getByRole("button", { name: /Tăng trọng số|Increase weight/i }),
    ).toBeEnabled();
  });

  it("keeps the weight stepper enabled while status is still loading", () => {
    // Same convention as the settings freeze: dimming during load would flash
    // a locked UI at a teacher editing a draft.
    renderPanel(null);
    expect(
      screen.getByRole("button", { name: /Tăng trọng số|Increase weight/i }),
    ).toBeEnabled();
  });
});
