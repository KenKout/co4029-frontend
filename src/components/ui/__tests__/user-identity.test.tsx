import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserEmailIdentity } from "../user-identity";

describe("UserEmailIdentity", () => {
  it("uses the same primary initials fallback as the dashboard and top bar", () => {
    render(
      <UserEmailIdentity
        id="user-1"
        displayName="Jane Doe"
        email="jane@example.com"
      />,
    );

    const fallback = screen.getByText("JD");
    expect(fallback.className).toContain("bg-m3-primary");
    expect(fallback.className).toContain("text-white");
    expect(fallback.className).toContain("font-bold");
  });
});
