import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { RichContent } from "@/components/ui/rich-content";

/**
 * Policy bodies, lesson notes and quiz content all render through
 * `RichContent`. It was rendering CommonMark only, so a pipe table became one
 * ordinary paragraph — published policy pages showed their tables as a wall of
 * literal `|` characters.
 *
 * These pin the GitHub-Flavoured Markdown features an author reasonably
 * expects from a markdown box, table first.
 */

const TABLE = `| Option | Behaviour |
|---|---|
| Continue and record | The session proceeds. |
| Warn and continue | The student is warned. |`;

describe("RichContent markdown", () => {
  it("renders a pipe table as a real table", () => {
    render(<RichContent value={TABLE} format="markdown" />);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    // Header cells, not body cells: a table whose header row is parsed as data
    // still "renders" but reads wrongly.
    expect(
      screen.getByRole("columnheader", { name: "Option" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Behaviour" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("leaves no literal pipe characters behind", () => {
    const { container } = render(
      <RichContent value={TABLE} format="markdown" />,
    );
    // The exact symptom from the published policy page.
    expect(container.textContent).not.toContain("|");
    expect(container.textContent).not.toContain("---");
  });

  it("supports the other GFM features an author will reach for", () => {
    render(
      <RichContent
        value={"~~struck~~\n\n- [x] done\n- [ ] todo"}
        format="markdown"
      />,
    );
    expect(screen.getByText("struck").tagName.toLowerCase()).toBe("del");
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("still escapes plain-format content rather than parsing it", () => {
    const { container } = render(
      <RichContent value={"| not | a table |"} format="plain" />,
    );
    // `plain` means plain: enabling GFM must not start parsing markup in text
    // fields that were never meant to carry it.
    expect(container.querySelector("table")).toBeNull();
    expect(container.textContent).toContain("| not | a table |");
  });
});
