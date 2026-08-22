import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VersionPanel } from "../VersionPanel";

const forkFn = vi.fn();

let versionsData: unknown[] = [];

vi.mock("@/lib/api/hooks/career-paths", () => ({
  usePathVersions: () => ({
    isLoading: false,
    isError: false,
    data: versionsData,
  }),
  useCreatePathVersion: () => ({
    isPending: false,
    mutateAsync: forkFn,
  }),
}));

describe("VersionPanel", () => {
  beforeEach(() => {
    forkFn.mockReset();
    versionsData = [];
  });

  it("renders version pills with statuses and the editing-draft affordance", () => {
    versionsData = [
      {
        id: "v1",
        career_path_id: "p",
        version_no: 1,
        status: "published",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "v2",
        career_path_id: "p",
        version_no: 2,
        status: "draft",
        created_at: "2026-02-01T00:00:00Z",
      },
    ];
    render(<VersionPanel id="p" canManage pathPublished />);
    expect(screen.getByRole("button", { name: "Version v1 published" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Version v2 draft" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByTestId("version-fork-button")).toBeNull();
  });

  it("forks only after confirmation", async () => {
    versionsData = [
      {
        id: "v1",
        career_path_id: "p",
        version_no: 1,
        status: "published",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    render(<VersionPanel id="p" canManage pathPublished />);
    const fork = screen.getByTestId("version-fork-button");
    expect(fork).toBeTruthy();
    // First click arms the confirmation — nothing is sent yet.
    fireEvent.click(fork);
    expect(forkFn).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create version" }));
    await waitFor(() => expect(forkFn).toHaveBeenCalledTimes(1));
  });

  it("cancelling the confirmation does not fork", () => {
    versionsData = [
      {
        id: "v1",
        career_path_id: "p",
        version_no: 1,
        status: "published",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    render(<VersionPanel id="p" canManage pathPublished />);
    fireEvent.click(screen.getByTestId("version-fork-button"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(forkFn).not.toHaveBeenCalled();
    expect(screen.queryByTestId("version-fork-button")).toBeTruthy();
  });

  it("hides the fork button for non-managers", () => {
    versionsData = [
      {
        id: "v1",
        career_path_id: "p",
        version_no: 1,
        status: "published",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    render(<VersionPanel id="p" canManage={false} pathPublished />);
    expect(screen.queryByTestId("version-fork-button")).toBeNull();
  });

  it("renders nothing on a draft-only path (no fork source)", () => {
    versionsData = [
      {
        id: "v1",
        career_path_id: "p",
        version_no: 1,
        status: "draft",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const { container } = render(
      <VersionPanel id="p" canManage pathPublished={false} />,
    );
    // Still renders the pill, but no fork button (nothing published to fork).
    expect(screen.getByRole("button", { name: "Version v1 draft" })).toBeTruthy();
    expect(screen.queryByTestId("version-fork-button")).toBeNull();
    expect(container.querySelectorAll("button")).toHaveLength(1);
  });
});
