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

/** Mirrors the spend severity thresholds in routes/admin/stats.tsx. */
function spendSeverity(deltaPct: number | null): ActionSeverity {
  if (deltaPct === null) return "ok";
  return deltaPct > 300 ? "critical" : deltaPct > 100 ? "warn" : "ok";
}

/**
 * Mirrors the interview pass-rate severity in routes/admin/stats.tsx.
 *
 * A low rate only means something once enough DISTINCT students have been
 * evaluated — otherwise it's a dev-testing artifact and shouting about it trains
 * operators to ignore the tile.
 */
function passRateSeverity(
  passRate: number,
  evaluated: number,
  students: number,
): ActionSeverity {
  const meaningful = evaluated >= 20 && students >= 5;
  if (!meaningful) return "ok";
  return passRate < 25 ? "critical" : passRate < 50 ? "warn" : "ok";
}

/** Mirrors the failure-rate trend calculation. */
function failureTrendPct(
  rateNow: number,
  failedPrev: number,
  totalPrev: number,
): number | null {
  const prevRate = totalPrev > 0 ? (100 * failedPrev) / totalPrev : null;
  if (prevRate === null || prevRate === 0) return null;
  return ((rateNow - prevRate) / prevRate) * 100;
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

describe("interview pass-rate severity (sample-size guarded)", () => {
  it("stays neutral on the dev-state sample despite a low rate", () => {
    // Real dev DB: 13.79% over 29 evaluated sessions from just 2 students.
    // Genuinely low, but 2 students is a testing artifact — going red here
    // would be a false alarm and would train operators to ignore the tile.
    expect(passRateSeverity(13.79, 29, 2)).toBe("ok");
  });

  it("goes critical at the same rate once enough students are involved", () => {
    // Same 13.79%, but now a real cohort — that IS a broken pipeline.
    expect(passRateSeverity(13.79, 40, 12)).toBe("critical");
  });

  it("requires BOTH enough sessions and enough students", () => {
    // Many sessions, too few students (one person retrying).
    expect(passRateSeverity(10, 100, 3)).toBe("ok");
    // Many students, too few sessions.
    expect(passRateSeverity(10, 8, 8)).toBe("ok");
    // Both thresholds met.
    expect(passRateSeverity(10, 20, 5)).toBe("critical");
  });

  it("bands a mediocre-but-not-broken rate as a warning", () => {
    expect(passRateSeverity(40, 50, 10)).toBe("warn");
    expect(passRateSeverity(75, 50, 10)).toBe("ok");
  });
});

describe("spend severity", () => {
  it("treats the observed ~19x spike as critical, not routine growth", () => {
    // Dev DB: $2.8127 vs $0.1462 = +1824%.
    const delta = spendDeltaPct(2.8127, 0.1462);
    expect(spendSeverity(delta)).toBe("critical");
  });

  it("leaves ordinary week-over-week movement neutral", () => {
    expect(spendSeverity(spendDeltaPct(105, 100))).toBe("ok");
    expect(spendSeverity(spendDeltaPct(80, 100))).toBe("ok");
  });

  it("warns in the doubling band", () => {
    expect(spendSeverity(spendDeltaPct(250, 100))).toBe("warn");
  });

  it("is neutral (not critical) when there is no prior baseline", () => {
    // First week of spend must not read as an infinite spike.
    expect(spendSeverity(spendDeltaPct(500, 0))).toBe("ok");
  });
});

describe("job failure rate trend", () => {
  it("returns null when the prior window had no jobs", () => {
    // Dev DB state: 0 jobs in the previous 7d, so there is no baseline. Must not
    // render as a flat or improving trend.
    expect(failureTrendPct(32.7, 0, 0)).toBeNull();
  });

  it("reports worsening when the rate climbed", () => {
    // 28% all-time -> 33% this week is a degradation.
    const t = failureTrendPct(33, 28, 100);
    expect(t).not.toBeNull();
    expect(t as number).toBeGreaterThan(0);
  });

  it("reports improvement when the rate fell", () => {
    const t = failureTrendPct(10, 40, 100);
    expect(t as number).toBeLessThan(0);
  });
});

describe("needs-attention list construction", () => {
  /** Mirrors the filter in routes/admin/stats.tsx. */
  function partition(counts: number[]) {
    const items = counts.filter((c) => c > 0);
    return { shown: items.length, clear: counts.length - items.length };
  }

  it("drops zero-count checks instead of listing them as resolved", () => {
    // Dev DB: stuck=0, missing_texp=0, configs=9, orgs=2.
    const { shown, clear } = partition([0, 0, 9, 2]);
    expect(shown).toBe(2);
    expect(clear).toBe(2);
  });

  it("shows nothing but an all-clear when everything is clean", () => {
    const { shown, clear } = partition([0, 0, 0, 0]);
    expect(shown).toBe(0);
    expect(clear).toBe(4);
  });

  it("lists every check when all have occurrences", () => {
    const { shown, clear } = partition([1, 2, 3, 4]);
    expect(shown).toBe(4);
    expect(clear).toBe(0);
  });
});
