import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { LessonKnowledgeMap } from "@/routes/courses/_components/LessonKnowledgeMap";

/**
 * The student knowledge map now reuses the teacher's `KnowledgeGraphDetail`
 * explorer so both roles see an identical graph, with the authoring
 * affordances (AI/Curated source toggle, Edit) omitted rather than disabled.
 *
 * NOTE: the shared test setup forces i18n to Vietnamese, so assertions match on
 * test ids / roles and Vietnamese strings rather than English labels.
 */

const publishedMock = vi.fn();
vi.mock("@/lib/api/hooks/materials", () => ({
  usePublishedLessonKnowledgeGraph: () => publishedMock(),
}));

const GRAPH = {
  lesson_id: "lesson-1",
  published: true,
  primary_node_id: "b",
  published_at: "2026-01-01T00:00:00Z",
  nodes: [
    {
      id: "a",
      label: "Process",
      type: "concept",
      definition: "A process",
      weight: 5,
    },
    {
      id: "b",
      label: "Kernel",
      type: "concept",
      definition: "The kernel",
      weight: 9,
    },
    { id: "c", label: "Thread", type: "concept", definition: null, weight: 3 },
  ],
  edges: [
    { source: "b", target: "a", relation: "prerequisites" },
    { source: "a", target: "c", relation: "related" },
  ],
};

beforeEach(() => {
  publishedMock.mockReset();
});

describe("LessonKnowledgeMap (student)", () => {
  it("renders nothing until a graph is published", () => {
    publishedMock.mockReturnValue({
      data: { lesson_id: "l", published: false, nodes: [], edges: [] },
    });
    const { container } = render(<LessonKnowledgeMap lessonId="lesson-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when published but empty", () => {
    publishedMock.mockReturnValue({
      data: { lesson_id: "l", published: true, nodes: [], edges: [] },
    });
    const { container } = render(<LessonKnowledgeMap lessonId="lesson-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a collapsed section with the concept count when published", () => {
    publishedMock.mockReturnValue({ data: GRAPH });
    render(<LessonKnowledgeMap lessonId="lesson-1" />);
    expect(
      screen.getByTestId("course-learn-knowledge-map"),
    ).toBeInTheDocument();
    // Concept count surfaced on the collapsed header.
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("opens the shared full-screen explorer", async () => {
    publishedMock.mockReturnValue({ data: GRAPH });
    const user = userEvent.setup();
    render(<LessonKnowledgeMap lessonId="lesson-1" />);

    await user.click(screen.getByRole("button"));

    // The teacher viewer renders an SVG canvas plus the node labels.
    expect(document.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("Kernel")).toBeInTheDocument();
    expect(screen.getByText("Process")).toBeInTheDocument();
  });

  it("exposes NO edit or source-toggle affordance to students", async () => {
    publishedMock.mockReturnValue({ data: GRAPH });
    const user = userEvent.setup();
    render(<LessonKnowledgeMap lessonId="lesson-1" />);
    await user.click(screen.getByRole("button"));

    // Edit and the AI/Curated source toggle must be absent — not merely
    // disabled — since the props that render them aren't passed.
    //
    // These match the ACTUAL vi strings (kg.edit = "Chỉnh sửa",
    // kg.source_curated = "Tự soạn", kg.source_label = "Nguồn sơ đồ"). Matching
    // a label that doesn't exist would make this assertion pass vacuously.
    expect(screen.queryByText("Chỉnh sửa")).not.toBeInTheDocument();
    expect(screen.queryByText("Nguồn sơ đồ")).not.toBeInTheDocument();
    expect(screen.queryByText("Tự soạn")).not.toBeInTheDocument();
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });

  it("hoists the primary node to the front for the viewer's centre", async () => {
    publishedMock.mockReturnValue({ data: GRAPH });
    const user = userEvent.setup();
    render(<LessonKnowledgeMap lessonId="lesson-1" />);
    await user.click(screen.getByRole("button"));

    // 'b' (Kernel) is primary_node_id despite being second in the payload; the
    // viewer treats nodes[0] as the centre, so it must be reordered first.
    const texts = Array.from(document.querySelectorAll("text")).map(
      (n) => n.textContent,
    );
    const kernel = texts.findIndex((x) => x === "Kernel");
    const process = texts.findIndex((x) => x === "Process");
    expect(kernel).toBeGreaterThanOrEqual(0);
    expect(process).toBeGreaterThanOrEqual(0);
    expect(kernel).toBeLessThan(process);
  });
});
