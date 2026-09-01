import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

/**
 * Curriculum row affordances on the teacher course page.
 *
 * Two things a CSS/markup regression can silently undo, so they are pinned
 * through the real components:
 *
 * 1. **Row-wide click target.** The row has always changed background on hover,
 *    which advertises "click me", but only the few characters of the title were
 *    actually a link — clicking beside the title did nothing. The title link now
 *    stretches over the whole row via `after:absolute after:inset-0`, which only
 *    works while the row itself stays `relative`. Both halves are asserted:
 *    lose either and the hover becomes a lie again.
 * 2. **Order numbers.** Modules and the items inside them are numbered from
 *    render order (the payload is served in `position` order), so a teacher can
 *    talk about "module 2, item 3" instead of counting rows.
 *
 * Controls that must stay clickable ON TOP of that overlay (drag grip, publish,
 * edit, duplicate) need `z-10`; the drag grip is asserted because it is the one
 * whose loss is invisible until someone tries to reorder.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href="#" className={className}>
      {children}
    </a>
  ),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === "string" ? d : k) }),
}));
// The row's mutations are irrelevant here; stub the hook so no query client is
// needed and the render stays a pure markup assertion.
vi.mock(
  "@/routes/teacher/_components/course-manage/use-module-item-row",
  () => ({
    useModuleItemRow: () => ({
      dragEnabled: false,
      setDragEnabled: () => undefined,
      duplicateItem: { isPending: false },
      publishing: false,
      handleDuplicateItem: () => undefined,
      handlePublish: () => undefined,
    }),
  }),
);

import { ModuleItemRow } from "@/routes/teacher/_components/course-manage/ModuleItemRow";
import type { CourseContentItem } from "@/lib/api/types/common";

function lessonItem(overrides: Partial<CourseContentItem> = {}): CourseContentItem {
  return {
    id: "item-1",
    item_type: "lesson",
    lesson_id: "lesson-1",
    quiz_id: null,
    interview_config_id: null,
    position: 1,
    unlock_rule_json: {},
    target: {
      id: "lesson-1",
      title: "Indexing basics",
      status: "published",
    },
    lesson: null,
    quiz: null,
    interview: null,
    ...overrides,
  };
}

function renderRow(index: number, item = lessonItem()) {
  const noop = () => undefined;
  return render(
    <ModuleItemRow
      item={item}
      courseId="course-1"
      index={index}
      isDragOver={false}
      isDragging={false}
      onDragStart={noop}
      onDragOver={noop}
      onDrop={noop}
      onDragEnd={noop}
    />,
  );
}

describe("ModuleItemRow", () => {
  it("stretches the title link across the whole row", () => {
    const { container } = renderRow(0);
    const link = screen.getByRole("link", { name: "Indexing basics" });
    // The invisible ::after is what turns the row into one big click target.
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
    // ...and it only covers the row while the row is a positioned ancestor.
    const row = container.firstElementChild as HTMLElement;
    expect(row.className.split(/\s+/)).toContain("relative");
  });

  it("keeps the drag grip above the row-wide overlay", () => {
    renderRow(0);
    const grip = screen.getByRole("button", {
      name: "teacher_common.drag_to_reorder",
    });
    // Without z-10 the stretched link swallows the grab and reordering breaks.
    expect(grip.className).toContain("z-10");
  });

  it("numbers the item from its position in the module", () => {
    renderRow(2);
    expect(screen.getByText("3.")).toBeTruthy();
  });

  it("still renders a title for an item with no target id", () => {
    renderRow(0, lessonItem({ lesson_id: null }));
    // No link to stretch, so the row is not a click target — but the title
    // must not disappear.
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Indexing basics")).toBeTruthy();
  });
});
