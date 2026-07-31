import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useConfirm } from "../use-confirm";

function Harness({ onResult }: { onResult: (ok: boolean) => void }) {
  const { confirm, dialog } = useConfirm({ confirmLabel: "Yes" });
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void confirm({ title: "Delete?", description: "Really?" }).then(
            onResult,
          );
        }}
      >
        trigger
      </button>
      {dialog}
    </>
  );
}

describe("useConfirm", () => {
  it("is closed until confirm() is called", () => {
    render(<Harness onResult={() => {}} />);
    expect(screen.queryByText("Delete?")).toBeNull();
  });

  it("resolves true when the confirm button is clicked", async () => {
    const results: boolean[] = [];
    render(<Harness onResult={(ok) => results.push(ok)} />);
    fireEvent.click(screen.getByText("trigger"));
    // dialog now shows the passed title/description
    screen.getByText("Delete?");
    screen.getByText("Really?");
    await act(async () => {
      fireEvent.click(screen.getByText("Yes"));
    });
    expect(results).toEqual([true]);
  });

  it("resolves false when cancelled", async () => {
    const results: boolean[] = [];
    render(<Harness onResult={(ok) => results.push(ok)} />);
    fireEvent.click(screen.getByText("trigger"));
    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });
    expect(results).toEqual([false]);
  });

  it("closes the dialog after resolving", async () => {
    render(<Harness onResult={() => {}} />);
    fireEvent.click(screen.getByText("trigger"));
    await act(async () => {
      fireEvent.click(screen.getByText("Yes"));
    });
    expect(screen.queryByText("Delete?")).toBeNull();
  });
});
