import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { StatusBadge } from "../status-badge";
import { USER_STATUS_TOKENS, STATUS_FALLBACK } from "@/lib/status-tokens";
import { ShieldCheck } from "lucide-react";

describe("StatusBadge", () => {
  it("renders the label and the mapped colour token", () => {
    const { container, getByText } = render(
      <StatusBadge
        status="active"
        tokens={USER_STATUS_TOKENS}
        label="Active"
      />,
    );
    getByText("Active");
    const span = container.querySelector("span")!;
    expect(span.className).toContain("bg-emerald-100");
    expect(span.className).toContain("text-emerald-700");
    // Default square shape.
    expect(span.className).toContain("rounded-md");
    expect(span.className).toContain("text-xs");
  });

  it("falls back to the raw status and slate fallback for unknown status", () => {
    const { container, getByText } = render(
      <StatusBadge status="mystery" tokens={USER_STATUS_TOKENS} />,
    );
    getByText("mystery");
    expect(container.querySelector("span")!.className).toContain(
      STATUS_FALLBACK.split(" ")[0],
    );
  });

  it("renders a pill with a leading icon when shape=pill + icon", () => {
    const { container } = render(
      <StatusBadge
        status="active"
        tokens={USER_STATUS_TOKENS}
        label="Active"
        shape="pill"
        icon={ShieldCheck}
      />,
    );
    const span = container.querySelector("span")!;
    expect(span.className).toContain("rounded-full");
    // The lucide icon renders as an <svg>.
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("honours the 11px size variant", () => {
    const { container } = render(
      <StatusBadge
        status="active"
        tokens={USER_STATUS_TOKENS}
        label="Active"
        size="sm"
      />,
    );
    expect(container.querySelector("span")!.className).toContain("text-[11px]");
  });
});
