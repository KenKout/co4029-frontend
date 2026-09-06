import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AddUserDialog, type AddUserController } from "../AddUserDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

describe("AddUserDialog", () => {
  it("collects the optional student ID in the account invite flow", async () => {
    const user = userEvent.setup();
    const createUser = vi.fn().mockResolvedValue({});
    const controller = {
      createUser,
      createUserPending: false,
      roleOptions: [
        { code: "student", name: "Student" },
        { code: "teacher", name: "Teacher" },
      ],
      orgOptions: [{ id: "org-1", name: "Org One" }],
    } as AddUserController;

    render(
      <AddUserDialog
        c={controller}
        open
        onOpenChange={() => undefined}
      />,
    );

    await user.type(screen.getByLabelText(/Email/), "student@example.com");
    await user.type(screen.getByLabelText(/Student ID/), "SV-001");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          primary_email: "student@example.com",
          organization_id: "org-1",
          role_code: "student",
          student_code: "SV-001",
        }),
      ),
    );
  });
});
