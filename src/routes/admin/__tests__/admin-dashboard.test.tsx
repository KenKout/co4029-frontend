import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
} from "@tanstack/react-router";
import * as React from "react";

import { ActionTile, type ActionSeverity } from "@/components/ui/action-tile";

/**
 * The admin dashboard is for a platform operator: cost, throughput, failures,
 * security. These tests pin the two things that carry meaning rather than
 * decoration — the severity thresholds, and the derived cost/activity values.
 *
 * The severity maths lives in the route component (not exported), so it's
 * mirrored here exactly; the tile rendering is tested for real.
 */

/** Mirrors the thresholds in routes/admin/stats.tsx. */
function failureSeverity(pct: number): ActionSeverity {
  return pct > 10 ? "critical" : pct > 2 ? "warn" : "ok";
}

function healthSeverity(ready: {
  postgres?: string;
  redis?: string;
  alembic_at_head?: boolean;
  errored?: boolean;
}): ActionSeverity {
  const parts =
    ready.postgres === undefined &&
    ready.redis === undefined &&
    ready.alembic_at_head === undefined
      ? []
      : [
          ready.postgres === "ok",
          ready.redis === "ok",
          ready.alembic_at_head === true,
        ];
  const known = parts.length > 0 && !ready.errored;
  if (!known) return "warn";
  return parts.every(Boolean) ? "ok" : "critical";
}

function spendDeltaPct(now: number, prev: number): number | null {
  return prev > 0 ? ((now - prev) / prev) * 100 : null;
}

function projectMonthEnd(
  spentSoFar: number,
  dayOfMonth: number,
  daysInMonth: number,
) {
  if (dayOfMonth <= 0) return 0;
  return (spentSoFar / dayOfMonth) * daysInMonth;
}

describe("job failure severity", () => {
  it("is neutral on a healthy platform", () => {
    expect(failureSeverity(0)).toBe("ok");
    expect(failureSeverity(2)).toBe("ok");
  });

  it("warns in the middle band", () => {
    expect(failureSeverity(2.1)).toBe("warn");
    expect(failureSeverity(10)).toBe("warn");
  });

  it("is loud at the observed real-world rate", () => {
    // Dev DB showed 17 of 52 jobs failing over 7d = 32.7%.
    expect(failureSeverity((17 / 52) * 100)).toBe("critical");
    // The rate quoted in the original report.
    expect(failureSeverity(28)).toBe("critical");
  });
});

describe("system health rollup", () => {
  it("is ok only when every dependency is ok", () => {
    expect(
      healthSeverity({ postgres: "ok", redis: "ok", alembic_at_head: true }),
    ).toBe("ok");
  });

  it("is critical when any single dependency fails", () => {
    expect(
      healthSeverity({ postgres: "ok", redis: "down", alembic_at_head: true }),
    ).toBe("critical");
    expect(
      healthSeverity({ postgres: "down", redis: "ok", alembic_at_head: true }),
    ).toBe("critical");
    // Pending migrations count as degraded — the schema doesn't match the code.
    expect(
      healthSeverity({ postgres: "ok", redis: "ok", alembic_at_head: false }),
    ).toBe("critical");
  });

  it("warns rather than claiming health when the probe is unavailable", () => {
    expect(healthSeverity({})).toBe("warn");
    expect(
      healthSeverity({
        postgres: "ok",
        redis: "ok",
        alembic_at_head: true,
        errored: true,
      }),
    ).toBe("warn");
  });
});

describe("cost snapshot maths", () => {
  it("computes the week-over-week delta", () => {
    // Dev DB: 2.8127 this week vs 0.1462 previous.
    const d = spendDeltaPct(2.8127, 0.1462);
    expect(d).not.toBeNull();
    expect(Math.round(d as number)).toBe(1824);
  });

  it("returns null (not Infinity) when the prior window had no spend", () => {
    expect(spendDeltaPct(5, 0)).toBeNull();
  });

  it("extrapolates month-end linearly and guards day zero", () => {
    expect(projectMonthEnd(10, 10, 30)).toBeCloseTo(30);
    expect(projectMonthEnd(0, 5, 31)).toBe(0);
    expect(projectMonthEnd(100, 0, 31)).toBe(0);
  });
});

describe("ActionTile", () => {
  function renderTile(
    props: Partial<React.ComponentProps<typeof ActionTile>> = {},
  ) {
    const rootRoute = createRootRoute({
      component: () => (
        <ActionTile
          label="Job failure rate"
          value="33%"
          to="/admin/processing"
          {...props}
        />
      ),
    });
    const idx = createRoute({ getParentRoute: () => rootRoute, path: "/" });
    const proc = createRoute({
      getParentRoute: () => rootRoute,
      path: "/admin/processing",
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([idx, proc]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return render(<RouterProvider router={router as any} />);
  }

  it("renders the value and links somewhere actionable", async () => {
    renderTile();
    expect(await screen.findByText("33%")).toBeInTheDocument();
    const link = document.querySelector("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toContain("/admin/processing");
  });

  it("stays visually neutral when healthy", async () => {
    renderTile({ severity: "ok", value: "0%" });
    await screen.findByText("0%");
    const link = document.querySelector("a")!;
    expect(link.className).not.toMatch(/red|amber/);
  });

  it("goes loud when critical", async () => {
    renderTile({ severity: "critical" });
    await screen.findByText("33%");
    const link = document.querySelector("a")!;
    expect(link.className).toMatch(/red/);
  });

  it("shows the supporting ratio when given", async () => {
    renderTile({ detail: "17 of 52 jobs, 7d" });
    expect(await screen.findByText("17 of 52 jobs, 7d")).toBeInTheDocument();
  });
});
