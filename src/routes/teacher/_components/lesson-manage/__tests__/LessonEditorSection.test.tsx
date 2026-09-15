import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonEditorSection } from "../LessonEditorSection";

describe("LessonEditorSection", () => {
  it("provides one responsive inset and surface for lesson editor sections", () => {
    render(
      <LessonEditorSection aria-label="Content section">
        Content
      </LessonEditorSection>,
    );

    expect(screen.getByRole("region", { name: "Content section" })).toHaveClass(
      "p-5",
      "sm:p-6",
      "rounded-2xl",
      "bg-card",
    );
  });

  it("preserves caller classes for section-specific layout", () => {
    render(
      <LessonEditorSection aria-label="Custom section" className="space-y-3">
        Content
      </LessonEditorSection>,
    );

    expect(screen.getByRole("region", { name: "Custom section" })).toHaveClass(
      "space-y-3",
    );
  });
});
