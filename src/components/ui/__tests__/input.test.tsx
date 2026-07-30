import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Input } from "../input";
import { Textarea } from "../textarea";

describe("Input", () => {
  it("renders a text field that reports what the user typed", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Title" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Title"), "Hi");

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("matches the Select trigger height at both densities", () => {
    // The whole point of the `size` token: a text field and a dropdown on the
    // same form row must be the same box. Assert the tokens rather than pixels
    // so this fails loudly if either primitive drifts.
    const { container: def } = render(<Input aria-label="a" />);
    expect(def.querySelector("input")!.className).toContain("h-10");
    expect(def.querySelector("input")!.className).toContain("rounded-xl");

    const { container: sm } = render(<Input aria-label="b" size="sm" />);
    expect(sm.querySelector("input")!.className).toContain("h-7");
    expect(sm.querySelector("input")!.className).toContain("rounded-md");
  });

  it("lets a call site override the density token with an explicit height", () => {
    // tailwind-merge must drop `h-10` — inline rows next to a `size=\"sm\"`
    // Button rely on this to height-match their sibling.
    const { container } = render(<Input aria-label="c" className="h-9" />);
    const cls = container.querySelector("input")!.className;
    expect(cls).toContain("h-9");
    expect(cls).not.toContain("h-10");
  });

  it("renders a unit adornment without stealing the accessible name", () => {
    render(<Input aria-label="Duration" endAdornment="min" />);

    // The unit is decorative: the label still names the field.
    expect(screen.getByLabelText("Duration")).toBeInTheDocument();
    expect(screen.getByText("min")).toHaveAttribute("aria-hidden", "true");
    // Right padding is reserved so a long value can't run under the unit.
    expect(screen.getByLabelText("Duration").className).toContain("pr-16");
  });

  it("does not wrap when there is no adornment", () => {
    const { container } = render(<Input aria-label="Plain" />);
    expect(container.firstChild).toBe(container.querySelector("input"));
  });

  it("strips native number spinners", () => {
    render(<Input aria-label="Count" type="number" />);
    expect(screen.getByLabelText("Count").className).toContain(
      "[&::-webkit-inner-spin-button]:appearance-none",
    );
  });
});

describe("Textarea", () => {
  it("defaults to 4 rows and shares the field styling", () => {
    render(<Textarea aria-label="Notes" />);
    const el = screen.getByLabelText("Notes");
    expect(el).toHaveAttribute("rows", "4");
    expect(el.className).toContain("rounded-xl");
    expect(el.className).toContain("border-m3-outline-variant/60");
  });

  it("reports typed text", async () => {
    const onChange = vi.fn();
    render(<Textarea aria-label="Notes" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Notes"), "ab");
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
