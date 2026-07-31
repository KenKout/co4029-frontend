import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { Select } from "@/components/ui/select";

/**
 * The styled Select that replaced the native <select> controls on the interview
 * config page. A native option list is painted by the OS, so it ignores the
 * app's tokens entirely; this component moves the popup into the DOM so it can
 * be styled — and, incidentally, tested.
 *
 * These cover the contract the page depends on: the trigger shows the selected
 * label (not the raw value), choosing an option reports the new value once, and
 * an empty-string option stays selectable (the "Default voice" case, where ""
 * is a meaningful value rather than "nothing selected").
 */

const PERSONAS = [
  { value: "strict", label: "Strict" },
  { value: "neutral", label: "Neutral" },
  { value: "supportive", label: "Supportive" },
] as const;

function Harness({
  initial = "neutral",
  onChange,
}: {
  initial?: string;
  onChange?: (v: string) => void;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <Select
      aria-label="AI persona"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      options={PERSONAS.map((p) => ({ value: p.value, label: p.label }))}
    />
  );
}

describe("Select", () => {
  it("shows the selected option's label, not its raw value", () => {
    render(<Harness initial="supportive" />);

    expect(
      screen.getByRole("combobox", { name: "AI persona" }),
    ).toHaveTextContent("Supportive");
  });

  it("opens on click and lists every option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "AI persona" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Strict",
      "Neutral",
      "Supportive",
    ]);
  });

  it("reports the chosen value once and updates the trigger", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "AI persona" }));
    await user.click(await screen.findByRole("option", { name: "Strict" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("strict");
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "AI persona" }),
      ).toHaveTextContent("Strict"),
    );
  });

  it("marks the current option as selected for assistive tech", async () => {
    const user = userEvent.setup();
    render(<Harness initial="neutral" />);

    await user.click(screen.getByRole("combobox", { name: "AI persona" }));

    const selected = await screen.findByRole("option", { selected: true });
    expect(selected).toHaveTextContent("Neutral");
  });

  it("is keyboard operable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole("combobox", { name: "AI persona" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("treats an empty-string option as a real choice", async () => {
    // The voice field uses "" for "Default voice"; it must be selectable and
    // must render its label rather than falling through to a placeholder.
    const user = userEvent.setup();
    const onChange = vi.fn();

    function VoiceHarness() {
      const [value, setValue] = React.useState("alloy");
      return (
        <Select
          aria-label="AI voice"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          options={[
            { value: "", label: "Default voice" },
            { value: "alloy", label: "Alloy" },
          ]}
        />
      );
    }

    render(<VoiceHarness />);
    await user.click(screen.getByRole("combobox", { name: "AI voice" }));
    await user.click(
      await screen.findByRole("option", { name: "Default voice" }),
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith("");
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "AI voice" }),
      ).toHaveTextContent("Default voice"),
    );
  });

  it("renders an optional hint line under an option label", async () => {
    const user = userEvent.setup();
    render(
      <Select
        aria-label="Mode"
        value="a"
        onValueChange={() => {}}
        options={[
          { value: "a", label: "Option A", hint: "What A does" },
          { value: "b", label: "Option B" },
        ]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Mode" }));

    expect(await screen.findByText("What A does")).toBeInTheDocument();
  });
});
