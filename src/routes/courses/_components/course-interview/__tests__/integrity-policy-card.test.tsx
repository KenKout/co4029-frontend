import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { InterviewIntegrityPolicyCard } from "../InterviewIntegrityPolicyCard";
import type { InterviewConfig } from "../use-course-interview";

/**
 * The lobby disclosure contract (decision 2026-09-10): before Start, the
 * learner sees all THREE configured weights + the threshold, and the explicit
 * "warning recorded, interview continues" behavior line. The card must show
 * the CONFIGURED numbers — what the server scores against — not hardcoded
 * defaults. Test setup boots the global i18n instance (vi per beforeEach); the
 * assertions target numbers + behavior copy that read the same in en and vi.
 */

function configWith(overrides: Partial<InterviewConfig> = {}): InterviewConfig {
  return {
    id: "cfg-1",
    course_id: "c-1",
    module_id: "m-1",
    title: "Interview",
    status: "published",
    max_follow_ups_per_question: 2,
    max_hints_per_question: 3,
    integrity_weight_tab_switch: 3,
    integrity_weight_focus_lost: 1,
    integrity_weight_fullscreen_exit: 2,
    integrity_score_threshold: 3,
    ...overrides,
  } as InterviewConfig;
}

describe("InterviewIntegrityPolicyCard", () => {
  it("renders every configured weight and the threshold before Start", () => {
    render(
      <InterviewIntegrityPolicyCard
        config={configWith({
          integrity_weight_tab_switch: 5,
          integrity_weight_focus_lost: 2,
          integrity_weight_fullscreen_exit: 4,
          integrity_score_threshold: 11,
        })}
      />,
    );
    // The card must show the CONFIGURED numbers, not the shipped defaults.
    expect(screen.getByText("5 điểm")).toBeInTheDocument();
    expect(screen.getByText("2 điểm")).toBeInTheDocument();
    expect(screen.getByText("4 điểm")).toBeInTheDocument();
    expect(screen.getByText("11 điểm")).toBeInTheDocument();
  });

  it("falls back to the shipped defaults when the config omits them", () => {
    render(
      <InterviewIntegrityPolicyCard
        config={
          configWith({
            integrity_weight_tab_switch: undefined,
            integrity_weight_focus_lost: undefined,
            integrity_weight_fullscreen_exit: undefined,
            integrity_score_threshold: undefined,
          })
        }
      />,
    );
    expect(screen.getAllByText("3 điểm")).toHaveLength(2); // tab_switch AND threshold
    expect(screen.getByText("1 điểm")).toBeInTheDocument();
    expect(screen.getByText("2 điểm")).toBeInTheDocument();
  });

  it("renders all three rule rows (tab switch / focus lost / fullscreen exit)", () => {
    render(<InterviewIntegrityPolicyCard config={configWith()} />);
    expect(screen.getByText("Chuyển tab")).toBeInTheDocument();
    expect(screen.getByText("Mất tiêu điểm")).toBeInTheDocument();
    expect(screen.getByText("Thoát toàn màn hình")).toBeInTheDocument();
    expect(screen.getByText("Ngưỡng cảnh báo")).toBeInTheDocument();
  });
});
