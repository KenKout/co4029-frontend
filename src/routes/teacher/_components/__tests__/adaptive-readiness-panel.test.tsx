import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdaptiveReadinessRead } from "@/lib/api/types";

// Mock the data hook so the panel can be tested in isolation (no network).
const mockUseAdaptiveReadiness = vi.fn();
vi.mock("@/lib/api/hooks/interviews", () => ({
  useAdaptiveReadiness: (configId: string | null | undefined) =>
    mockUseAdaptiveReadiness(configId),
}));

import { AdaptiveReadinessPanel } from "../adaptive-readiness-panel";

function ok(data: AdaptiveReadinessRead) {
  mockUseAdaptiveReadiness.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  });
}

describe("AdaptiveReadinessPanel", () => {
  it("shows the all-clear state and rollout badges when there are no warnings", () => {
    ok({
      config_id: "c1",
      warnings: [],
      rollout: { text: true, hybrid: true, voice: false },
      blocks_publish: false,
    });
    render(<AdaptiveReadinessPanel configId="c1" />);
    // All-clear message (VI is the default test locale).
    expect(
      screen.getByText(/đã sẵn sàng cho phỏng vấn thích ứng/i),
    ).toBeInTheDocument();
    // Rollout status section is present for all three modes.
    expect(screen.getByText(/trạng thái triển khai/i)).toBeInTheDocument();
  });

  it("localizes a warning from its machine code with the affected count", () => {
    ok({
      config_id: "c1",
      warnings: [
        {
          code: "questions_without_outcome",
          level: "warning",
          affected_ids: ["q1", "q2"],
          count: 2,
        },
      ],
      rollout: { text: true, hybrid: true, voice: false },
      blocks_publish: false,
    });
    render(<AdaptiveReadinessPanel configId="c1" />);
    expect(
      screen.getByText(/2 câu hỏi đã duyệt chưa được liên kết/i),
    ).toBeInTheDocument();
  });

  it("renders an unknown warning code via the generic fallback", () => {
    ok({
      config_id: "c1",
      warnings: [
        { code: "some_future_code", level: "info", affected_ids: [], count: 1 },
      ],
      rollout: { text: false, hybrid: false, voice: false },
      blocks_publish: false,
    });
    render(<AdaptiveReadinessPanel configId="c1" />);
    expect(screen.getByText(/mục cần chú ý/i)).toBeInTheDocument();
  });
});
