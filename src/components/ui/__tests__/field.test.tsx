import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Field } from "../field";

describe("Field", () => {
  it("renders the label and links it to the control via htmlFor/id", () => {
    const { getByText, container } = render(
      <Field label="Display name" renderControl={(p) => <input {...p} />} />,
    );
    const label = getByText("Display name") as HTMLLabelElement;
    const input = container.querySelector("input")!;
    expect(label.htmlFor).toBe(input.id);
    expect(input.id).toBeTruthy();
  });

  it("shows a required marker when required", () => {
    const { getByText } = render(
      <Field label="Name" required>
        x
      </Field>,
    );
    expect(getByText("*")).toBeTruthy();
  });

  it("wires aria-invalid + aria-describedby to the error, and shows the error text", () => {
    const { container, getByText } = render(
      <Field
        label="Email"
        error="Required"
        renderControl={(p) => <input {...p} />}
      />,
    );
    const input = container.querySelector("input")!;
    const err = getByText("Required");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(err.id);
    expect(err.id).toMatch(/-error$/);
  });

  it("shows the hint (linked via aria-describedby) when there is no error", () => {
    const { container, getByText } = render(
      <Field
        label="Bio"
        hint="Max 1000 chars"
        renderControl={(p) => <input {...p} />}
      />,
    );
    const input = container.querySelector("input")!;
    const hint = getByText("Max 1000 chars");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
    expect(hint.id).toMatch(/-hint$/);
  });

  it("error replaces the hint when both are provided", () => {
    const { queryByText, getByText } = render(
      <Field
        label="X"
        hint="the hint"
        error="the error"
        renderControl={(p) => <input {...p} />}
      />,
    );
    getByText("the error");
    expect(queryByText("the hint")).toBeNull();
  });
});
