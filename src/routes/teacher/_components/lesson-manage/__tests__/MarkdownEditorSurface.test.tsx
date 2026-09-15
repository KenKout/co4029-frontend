import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { MarkdownEditorSurface } from "../MarkdownEditorSurface";

describe("MarkdownEditorSurface", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the current Markdown with GFM in preview mode", async () => {
    const user = userEvent.setup();
    render(
      <MarkdownEditorSurface
        value={"# Lesson title\n\n| Topic | Status |\n| --- | --- |\n| Keys | Ready |"}
        onChange={vi.fn()}
        editorRef={createRef<HTMLTextAreaElement>()}
        placeholder="Write content"
        toolbar={<button type="button">Bold</button>}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Lesson title" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows an empty-state message and can return to the textarea", async () => {
    const user = userEvent.setup();
    render(
      <MarkdownEditorSurface
        value=""
        onChange={vi.fn()}
        editorRef={createRef<HTMLTextAreaElement>()}
        placeholder="Write content"
        toolbar={null}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByText("Start writing to see the rendered preview.")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Write" }));
    expect(screen.getByPlaceholderText("Write content")).toBeVisible();
  });
});
