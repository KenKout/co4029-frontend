import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsersToolbar } from "../UsersToolbar";
import type { AdminUsersController } from "../use-admin-users";

/**
 * Stateful harness — search/role/org are REAL state so a keystroke or a pick
 * flows back through the controlled props the way useServerTable would.
 */
function Harness() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [orgFilter, setOrgFilter] = useState<string | undefined>(undefined);
  const c = {
    t: (k: string) => k,
    table: { search, setSearch, roleFilter, setRoleFilter, orgFilter, setOrgFilter },
    roleOptions: [
      { code: "teacher", name: "Teacher" },
      { code: "student", name: "Student" },
    ],
    orgOptions: [
      { id: "org-1", name: "Org A" },
      { id: "org-2", name: "Org B" },
    ],
  } as unknown as AdminUsersController;
  return <UsersToolbar c={c} />;
}

describe("admin users toolbar", () => {
  it("renders the shared search box and both filter chips, with no native <select>", () => {
    render(<Harness />);
    screen.getByPlaceholderText("admin.users.search_placeholder");
    expect(
      screen.getAllByRole("combobox", {
        name: "admin.users.filter_role",
      }).length,
    ).toBeGreaterThanOrEqual(1);
    // Regression: the old toolbar hand-rolled native <select>s for role/org;
    // the shared DataTableToolbar renders Base UI comboboxes instead.
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it("keeps search typing in the input (controlled round-trip through table.search)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByPlaceholderText("admin.users.search_placeholder");
    await user.type(input, "nguyen");
    expect(input).toHaveValue("nguyen");
  });

  it("reflects the picked role on its filter chip", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole("combobox", { name: "admin.users.filter_role" }),
    );
    await user.click(await screen.findByText("Teacher"));
    expect(
      screen.getByRole("combobox", { name: "admin.users.filter_role" }),
    ).toHaveTextContent("Teacher");
  });

  it("reflects the picked organization on its filter chip", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole("combobox", {
        name: "admin.users.filter_organization",
      }),
    );
    await user.click(await screen.findByText("Org A"));
    expect(
      screen.getByRole("combobox", {
        name: "admin.users.filter_organization",
      }),
    ).toHaveTextContent("Org A");
  });
});
