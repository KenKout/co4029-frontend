import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// The bar derives its Model/Role options from the existing cost endpoints, so
// stub those hooks rather than standing up a query client + server.
vi.mock("@/lib/api/hooks/admin-costs", () => ({
  useAiCostsByModel: () => ({
    data: [
      { model_name: "gpt-4.1-mini" },
      { model_name: "gemini-3.5-flash-low" },
    ],
  }),
  useAiCostsByCategory: () => ({
    data: [{ dimension_value: "generation" }, { dimension_value: "embedding" }],
  }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { FilterBar } from "../FilterBar";

describe("ai-costs FilterBar", () => {
  const noop = () => {};
  const empty = { model: null, role: null, operation: null, status: null };

  it("renders all four filters as labelled comboboxes (uniform control shape)", () => {
    render(<FilterBar filters={empty} onChange={noop} range={{ from: "2026-08-01", to: "2026-08-30" }} />);
    // All four are selects now — Model/Role are closed sets, not free text.
    // A stray <input type=text> would mean the old search-box shape is back.
    expect(document.querySelectorAll('input[type="text"]').length).toBe(0);
    for (const key of [
      "admin.ai_costs.filters.model",
      "admin.ai_costs.filters.role",
      "admin.ai_costs.filters.operation",
      "admin.ai_costs.filters.status",
    ]) {
      // label text is present exactly once per filter
      expect(screen.getAllByText(key).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("labels sit in their own flex-col cell so they align across controls", () => {
    const { container } = render(
      <FilterBar filters={empty} onChange={noop} range={{ from: "2026-08-01", to: "2026-08-30" }} />,
    );
    const cells = container.querySelectorAll(".flex.flex-col.gap-1");
    // one cell per filter: the layout bug was labels rendering inline beside
    // <input> for Model/Role while <Select> pushed its label above.
    expect(cells.length).toBe(4);
  });

  it("hides the clear button and the partial-coverage note when no filter is set", () => {
    render(<FilterBar filters={empty} onChange={noop} range={{ from: "2026-08-01", to: "2026-08-30" }} />);
    expect(screen.queryByText("admin.ai_costs.filters.clear")).toBeNull();
    expect(
      screen.queryByText("admin.ai_costs.filters.partial_note"),
    ).toBeNull();
  });

  it("shows the clear button and warns which sections ignore filters when active", () => {
    render(
      <FilterBar
        filters={{ ...empty, model: "gpt-4.1-mini" }}
        onChange={noop}
        range={{ from: "2026-08-01", to: "2026-08-30" }}
      />,
    );
    screen.getByText("admin.ai_costs.filters.clear");
    // by-user / by-pipeline / recent don't accept these params server-side;
    // saying so is what stops the filter looking broken.
    screen.getByText("admin.ai_costs.filters.partial_note");
  });
});
