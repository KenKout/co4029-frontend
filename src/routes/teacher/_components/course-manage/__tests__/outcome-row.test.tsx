import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { OutcomeRow } from "../OutcomeRow";
import type { CourseOutcomesController } from "../use-course-outcomes-editor";

const ctl = {
  editable: false,
  editingId: null,
  setEditingId: () => {},
  draggingId: null,
  setDraggingId: () => {},
  dropOn: () => {},
} as unknown as CourseOutcomesController;

describe("OutcomeRow statement alignment", () => {
  it("renders the statement LEFT-aligned (justify-start, not the Button default center)", () => {
    const html = renderToStaticMarkup(
      <OutcomeRow
        outcome={
          {
            id: "o1",
            outcome_text: "Design a normalized schema",
            code: 1,
            position: 1,
            depth: 0,
          } as never
        }
        ctl={ctl}
        t={((k: string) => k) as never}
      />,
    );
    expect(html).toContain("justify-start");
    expect(html).toContain("text-left");
  });
});
