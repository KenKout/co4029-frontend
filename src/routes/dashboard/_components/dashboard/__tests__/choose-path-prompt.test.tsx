/**
 * The choose-path prompt is the only thing standing between a student in
 * `awaiting_path` and an empty dashboard they cannot act on, so the cases that
 * matter are the ones where it must NOT appear (noise for everyone else) and
 * the one where it must.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ChoosePathPrompt } from "../ChoosePathPrompt";
import type { LearningProgramEnrollment } from "@/lib/api/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // Echo the key plus its interpolations so assertions can see which branch
    // rendered and that the programme name actually reached the copy.
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}|${JSON.stringify(vars)}` : key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

function enrollment(
  over: Partial<LearningProgramEnrollment> = {},
): LearningProgramEnrollment {
  return {
    id: "enr-1",
    status: "awaiting_path",
    program_name: "Software Engineering",
    paths: [
      { career_path_id: "p1", status: "published" },
      { career_path_id: "p2", status: "published" },
    ],
    ...over,
  } as unknown as LearningProgramEnrollment;
}

describe("ChoosePathPrompt", () => {
  it("renders nothing when the student has no programmes", () => {
    const { container } = render(<ChoosePathPrompt enrollments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once a path has been chosen", () => {
    const { container } = render(
      <ChoosePathPrompt enrollments={[enrollment({ status: "active" })]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("prompts and links to the comparison screen while awaiting a path", () => {
    render(<ChoosePathPrompt enrollments={[enrollment()]} />);
    expect(screen.getByText("dashboard.choose_path.title")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /dashboard\.choose_path\.cta/ }),
    ).toHaveAttribute("href", "/me/learning-programs");
  });

  it("names the programme and counts only its selectable paths", () => {
    render(
      <ChoosePathPrompt
        enrollments={[
          enrollment({
            paths: [
              { career_path_id: "p1", status: "published" },
              // Archived paths cannot be chosen, so promising three would
              // send the student looking for one that is not offered.
              { career_path_id: "p2", status: "archived" },
            ],
          } as Partial<LearningProgramEnrollment>),
        ]}
      />,
    );
    const body = screen.getByText(/dashboard\.choose_path\.body\|/);
    expect(body).toHaveTextContent("Software Engineering");
    expect(body).toHaveTextContent('"count":1');
  });

  it("switches to the multi-programme wording rather than naming one", () => {
    render(
      <ChoosePathPrompt
        enrollments={[
          enrollment(),
          enrollment({ id: "enr-2", program_name: "Data Science" }),
        ]}
      />,
    );
    expect(
      screen.getByText(/dashboard\.choose_path\.body_many\|/),
    ).toHaveTextContent('"count":2');
  });

  it("ignores programmes that are not awaiting a path when counting", () => {
    render(
      <ChoosePathPrompt
        enrollments={[
          enrollment({ status: "completed" }),
          enrollment({ id: "enr-2", program_name: "Data Science" }),
        ]}
      />,
    );
    // One awaiting enrolment left, so the singular, programme-named branch.
    expect(
      screen.getByText(/dashboard\.choose_path\.body\|/),
    ).toHaveTextContent("Data Science");
  });
});
