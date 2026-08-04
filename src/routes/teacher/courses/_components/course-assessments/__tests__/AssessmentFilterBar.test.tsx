import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssessmentFilterBar } from "../AssessmentFilterBar";
import type { CourseAssessmentsController } from "../use-course-assessments-controller";

/** Stateful harness around the three dropdown filters (title/result/time). */
function Harness() {
  const [titleFilter, setTitleFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const controller = {
    tab: "quizzes",
    quizTitles: ["Quiz A", "Quiz B"],
    interviewTitles: ["Interview X"],
    titleFilter,
    setTitleFilter,
    resultFilter,
    setResultFilter,
    timeFilter,
    setTimeFilter,
  } as unknown as CourseAssessmentsController;
  return <AssessmentFilterBar controller={controller} />;
}

describe("course assessments filter bar", () => {
  it("renders the three dropdowns via the shared FilterBar (no native <select>)", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox", { name: "Quiz" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Result" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Time" })).toBeInTheDocument();
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it("lists the quizzes of the active tab under an 'All quizzes' row", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // Trigger already reads "All quizzes" before opening…
    expect(
      screen.getByRole("combobox", { name: "Quiz" }),
    ).toHaveTextContent("All quizzes");
    await user.click(screen.getByRole("combobox", { name: "Quiz" }));
    // …and the popup lists the tab's titles (the trigger duplicates the
    // "all" label, hence findAllByText).
    expect((await screen.findAllByText("Quiz A")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Quiz B")).toBeInTheDocument();
  });

  it("reflects the picked result and shows Clear filters, which resets it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox", { name: "Result" }));
    await user.click(await screen.findByText("Passed"));
    expect(
      screen.getByRole("combobox", { name: "Result" }),
    ).toHaveTextContent("Passed");
    // One non-default filter → the shared Clear filters button appears…
    const clear = await screen.findByText("Clear filters");
    // …and clicking it puts every dropdown back to its "all" row.
    await user.click(clear);
    expect(
      screen.getByRole("combobox", { name: "Result" }),
    ).toHaveTextContent("All results");
    expect(screen.queryByText("Clear filters")).toBeNull();
  });
});
