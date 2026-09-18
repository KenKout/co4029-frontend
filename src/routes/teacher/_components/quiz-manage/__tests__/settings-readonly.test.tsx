import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsLockedSections } from "../SettingsLockedSections";
import { SettingsBehaviorSection } from "../SettingsBehaviorSection";
import { SettingsScoringSection } from "../SettingsScoringSection";
import { SettingsSummary } from "../SettingsSummary";
import { settingsFixture } from "./settings-fixture";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const k = "teacher_quiz_manage.settings";
describe("published quiz settings inspection", () => {
  it("opens review, mastery and security without enabling mutation controls", async () => {
    const user = userEvent.setup();
    const update = vi.fn();
    render(
      <SettingsLockedSections
        draft={settingsFixture()}
        locked
        update={update}
        setDraft={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: `${k}.review.customize` }),
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(15);
    screen
      .getAllByRole("checkbox")
      .forEach((input) => expect(input).toBeDisabled());
    await user.click(
      screen.getByRole("button", { name: `${k}.spacing.advanced.toggle` }),
    );
    expect(screen.getAllByRole("spinbutton")).toHaveLength(3);
    screen
      .getAllByRole("spinbutton")
      .forEach((input) => expect(input).toBeDisabled());
    await user.click(screen.getByRole("button", { name: `${k}.access.title` }));
    expect(
      screen.getByPlaceholderText("10.0.0.0/8, 192.168.1.5"),
    ).toBeDisabled();
    expect(update).not.toHaveBeenCalled();
  });
  it("offers precise passing score input and preserves the grading preference when hidden", () => {
    const draft = { ...settingsFixture(), allow_retakes: false };
    const update = vi.fn();
    render(
      <SettingsScoringSection draft={draft} locked={false} update={update} />,
    );
    const input = screen.getByRole("spinbutton", {
      name: `${k}.assist.precise_score`,
    });
    expect(input).toHaveValue(72.25);
    fireEvent.change(input, { target: { value: "73.5" } });
    expect(update).toHaveBeenCalledWith("passing_score_percent", 73.5);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalledWith(
      "grading_method",
      expect.anything(),
    );
  });
  it("hides SM-2 dependent controls while spaced repetition is inactive", () => {
    const draft = {
      ...settingsFixture(),
      feeds_spaced_repetition: false,
      reminders_enabled: true,
    };
    const { rerender } = render(
      <SettingsLockedSections
        draft={draft}
        locked={false}
        update={vi.fn()}
        setDraft={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("switch", {
        name: new RegExp(`${k}\\.spacing\\.enabled_label`),
      }),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      screen.queryByRole("button", { name: `${k}.spacing.advanced.toggle` }),
    ).not.toBeInTheDocument();

    rerender(
      <SettingsBehaviorSection draft={draft} locked={false} update={vi.fn()} />,
    );
    expect(
      screen.queryByRole("switch", {
        name: new RegExp(`${k}\\.behavior\\.reminders_label`),
      }),
    ).not.toBeInTheDocument();
  });
  it("keeps the configuration and publish summaries consistent with SM-2 being off", () => {
    render(
      <SettingsSummary
        draft={{ ...settingsFixture(), feeds_spaced_repetition: false }}
      />,
    );
    expect(
      screen.getByText(`${k}.spacing.enabled_summary`),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(`${k}.assist.mastery_mode`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`${k}.assist.mastery_distinction`),
    ).not.toBeInTheDocument();
  });
});
