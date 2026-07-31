import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SearchInput } from "../search-input";

describe("SearchInput", () => {
  it("renders the magnifier icon and an input with left padding", () => {
    const { container } = render(<SearchInput placeholder="Search…" />);
    // lucide Search renders an <svg>; the input carries pl-9 by default.
    expect(container.querySelector("svg")).not.toBeNull();
    const input = container.querySelector("input")!;
    expect(input.className).toContain("pl-9");
    expect(input.getAttribute("placeholder")).toBe("Search…");
  });

  it("passes through arbitrary input props (value/onChange)", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SearchInput value="hello" onChange={onChange} />,
    );
    const input = container.querySelector("input")! as HTMLInputElement;
    expect(input.value).toBe("hello");
    fireEvent.change(input, { target: { value: "world" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows the clear button only when onClear + a value are present, and fires it", () => {
    const onClear = vi.fn();
    const { container, rerender } = render(
      <SearchInput value="" onClear={onClear} />,
    );
    // empty value → no clear button
    expect(container.querySelectorAll("button").length).toBe(0);
    rerender(<SearchInput value="x" onClear={onClear} />);
    const btn = container.querySelector("button")!;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(onClear).toHaveBeenCalled();
    // clear button forces pr-9 on the input
    expect(container.querySelector("input")!.className).toContain("pr-9");
  });

  it("lets a passed className override the default padding via tw-merge", () => {
    const { container } = render(<SearchInput className="pl-10" />);
    const cls = container.querySelector("input")!.className;
    expect(cls).toContain("pl-10");
    expect(cls).not.toContain("pl-9");
  });
});
