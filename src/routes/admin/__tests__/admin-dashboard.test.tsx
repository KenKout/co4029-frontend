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

import { ActionTile } from "@/components/ui/action-tile";
import {
  AI_FAILURE_BANDS,
  API_ERROR_BANDS,
  JOB_FAILURE_BANDS,
  QUEUE_AGE_CRITICAL_SECONDS,
  QUEUE_AGE_WARN_SECONDS,
  buildAlerts,
  buildCurrentStatus,
  deltaPct,
  inactiveOrgSeverity,
  queueSeverity,
  rateSeverity,
  rateTrendPct,
  spendSeverity,
} from "@/routes/admin/_components/stats/helpers";
import type {
  CostSummary,
  CurrentStatus,
  ReliabilitySummary,
  StatsFormatters,
  TenantSummary,
} from "@/routes/admin/_components/stats/types";

/**
 * The Admin Operations overview is for a platform operator: is it up, what
 * must I do, how is it trending, what is it costing.
 *
 * These tests import the real helpers rather than mirroring their arithmetic —
 * the previous version of this file re-implemented the severity maths inline,
 * which meant it kept passing while the page drifted underneath it.
 */

/** Deterministic formatters, so assertions read as the strings a user sees. */
const f: StatsFormatters = {
  count: (n) => String(n ?? 0),
  usd: (n) => `$${(n ?? 0).toFixed(2)}`,
  pct: (n, digits = 0) =>
    n === null || n === undefined ? "No data" : `${n.toFixed(digits)}%`,
  seconds: (ms) => (ms === null || ms === undefined ? "No data" : `${ms}ms`),
  duration: (s) => (s === null || s === undefined ? "No data" : `${s}s`),
};

/** Echoes the key back so assertions can name the string that was chosen. */
const t = (key: string) => key;

const HEALTHY_STATUS: CurrentStatus = {
  overall: "ok",
  services: [{ key: "postgres", label: "Postgres", state: "ok" }],
  uncheckedServices: [],
  isLoading: false,
  isError: false,
};

function reliability(
  over: Partial<ReliabilitySummary> = {},
): ReliabilitySummary {
  return {
    jobFailureRatePct: null,
    jobFailureTrendPct: null,
    jobsTerminal: 0,
    jobsFailed: 0,
    jobSeverity: "ok",
    queueDepth: 0,
    queueOldestAgeSeconds: null,
    queueSeverity: "ok",
    apiErrorRatePct: null,
    requests: 0,
    requests5xx: 0,
    apiSeverity: "ok",
    apiP95LatencyMs: null,
    ...over,
  };
}

function cost(over: Partial<CostSummary> = {}): CostSummary {
  return {
    spend: 0,
    prevSpend: 0,
    deltaPct: null,
    severity: "ok",
    projectedMonthEnd: 0,
    tokens: 0,
    aiFailureRatePct: null,
    aiCalls: 0,
    aiFailed: 0,
    aiSeverity: "ok",
    topDriver: null,
    topDriverUsd: 0,
    slowestModel: null,
    slowestModelP95Ms: 0,
    materialsIngested: 0,
    activeUsersToday: 0,
    activeUsersWindow: 0,
    totalUsers: 0,
    ...over,
  };
}

function tenant(over: Partial<TenantSummary> = {}): TenantSummary {
  return { orgsTotal: 0, orgsInactive: 0, severity: "ok", ...over };
}

describe("rate severity — no data is not a warning", () => {
  it("stays neutral when the window held nothing", () => {
    // A quiet deployment must not glow amber forever. `null` means the
    // denominator was empty, which is not a fault condition.
    expect(rateSeverity(null, JOB_FAILURE_BANDS)).toBe("ok");
    expect(rateSeverity(null, API_ERROR_BANDS)).toBe("ok");
    expect(rateSeverity(null, AI_FAILURE_BANDS)).toBe("ok");
  });

  it("is neutral on a genuinely clean window", () => {
    expect(rateSeverity(0, JOB_FAILURE_BANDS)).toBe("ok");
  });

  it("bands job failures at 2% and 10%", () => {
    expect(rateSeverity(2, JOB_FAILURE_BANDS)).toBe("ok");
    expect(rateSeverity(2.1, JOB_FAILURE_BANDS)).toBe("warn");
    expect(rateSeverity(10, JOB_FAILURE_BANDS)).toBe("warn");
    // Dev DB showed 17 of 52 terminal jobs failing = 32.7%.
    expect(rateSeverity((17 / 52) * 100, JOB_FAILURE_BANDS)).toBe("critical");
  });

  it("holds server errors to a much tighter band than AI calls", () => {
    // 3% of requests 5xx is an incident; 3% of AI calls failing is a Tuesday.
    expect(rateSeverity(3, API_ERROR_BANDS)).toBe("warn");
    expect(rateSeverity(3, AI_FAILURE_BANDS)).toBe("ok");
  });
});

describe("queue severity — age, not depth", () => {
  it("treats an empty queue as fine regardless of age data", () => {
    expect(queueSeverity(0, null)).toBe("ok");
  });

  it("treats a deep but fast-moving queue as fine", () => {
    // 500 jobs that all arrived a minute ago is throughput, not a stall.
    expect(queueSeverity(500, 60)).toBe("ok");
  });

  it("warns once the oldest job has been waiting half an hour", () => {
    expect(queueSeverity(3, QUEUE_AGE_WARN_SECONDS)).toBe("warn");
  });

  it("goes critical on a two-hour-old job even with a shallow queue", () => {
    // One job stuck for hours is a broken pipeline; depth hides that entirely.
    expect(queueSeverity(1, QUEUE_AGE_CRITICAL_SECONDS)).toBe("critical");
  });

  it("cannot judge depth without an age", () => {
    expect(queueSeverity(40, null)).toBe("ok");
  });
});

describe("spend severity", () => {
  it("treats the observed ~19x spike as critical, not routine growth", () => {
    // Dev DB: $2.8127 vs $0.1462 = +1824%.
    expect(spendSeverity(deltaPct(2.8127, 0.1462))).toBe("critical");
  });

  it("leaves ordinary week-over-week movement neutral", () => {
    expect(spendSeverity(deltaPct(105, 100))).toBe("ok");
    expect(spendSeverity(deltaPct(80, 100))).toBe("ok");
  });

  it("warns in the doubling band", () => {
    expect(spendSeverity(deltaPct(250, 100))).toBe("warn");
  });

  it("is neutral when there is no prior baseline", () => {
    // First window of spend must not read as an infinite spike.
    expect(deltaPct(500, 0)).toBeNull();
    expect(spendSeverity(null)).toBe("ok");
  });
});

describe("rate trend", () => {
  it("returns null when the prior window had no data", () => {
    expect(rateTrendPct(32.7, null)).toBeNull();
    expect(rateTrendPct(32.7, 0)).toBeNull();
  });

  it("reports worsening when the rate climbed", () => {
    expect(rateTrendPct(33, 28)).toBeGreaterThan(0);
  });

  it("reports improvement when the rate fell", () => {
    expect(rateTrendPct(10, 40)).toBeLessThan(0);
  });
});

describe("current status", () => {
  it("is unknown, never healthy, when the probe did not answer", () => {
    const status = buildCurrentStatus(t, undefined, {
      isLoading: false,
      isError: true,
    });
    expect(status.overall).toBe("unknown");
    expect(status.services).toEqual([]);
  });

  it("does not claim full health while a dependency went unchecked", () => {
    // The backend rolls a skipped probe up as "ok" — correct for a readiness
    // check, wrong for an operator headline. Saying "all systems operational"
    // over an unverified AI provider asserts something nobody measured.
    const status = buildCurrentStatus(
      t,
      {
        status: "ok",
        version: "0.7.0",
        git_sha: null,
        checks: {
          postgres: { status: "ok", latency_ms: 3 },
          llm_provider: { status: "skipped", latency_ms: null },
        },
      },
      { isLoading: false, isError: false },
    );
    expect(status.overall).toBe("partial");
    // Labels, not raw keys — the row names the dependency to the operator.
    // The stub `t` echoes the key back, hence the prefixed form here.
    expect(status.uncheckedServices).toEqual([
      "admin.dashboard.services.llm_provider",
    ]);
  });

  it("stays fully ok when every dependency actually reported", () => {
    const status = buildCurrentStatus(
      t,
      {
        status: "ok",
        version: "0.7.0",
        git_sha: null,
        checks: {
          postgres: { status: "ok", latency_ms: 3 },
          redis: { status: "ok", latency_ms: 1 },
        },
      },
      { isLoading: false, isError: false },
    );
    expect(status.overall).toBe("ok");
    expect(status.uncheckedServices).toEqual([]);
  });

  it("does not let a deliberately disabled feature downgrade the rollup", () => {
    // A feature switched off is a configuration choice, not an unknown.
    const status = buildCurrentStatus(
      t,
      {
        status: "ok",
        version: "0.7.0",
        git_sha: null,
        checks: {
          postgres: { status: "ok", latency_ms: 3 },
          neo4j: { status: "disabled", latency_ms: null },
        },
      },
      { isLoading: false, isError: false },
    );
    expect(status.overall).toBe("ok");
    expect(status.uncheckedServices).toEqual([]);
  });

  it("keeps a disabled dependency distinct from a healthy one", () => {
    // A feature switched off should read as off. Folding it into "ok" would
    // claim coverage the deployment does not have.
    const status = buildCurrentStatus(
      t,
      {
        status: "ok",
        version: "0.7.0",
        git_sha: null,
        checks: {
          postgres: { status: "ok", latency_ms: 3 },
          neo4j: { status: "disabled", latency_ms: null },
        },
      },
      { isLoading: false, isError: false },
    );
    expect(status.services.map((s) => s.state)).toEqual(["ok", "disabled"]);
  });

  it("names known dependencies in a stable order", () => {
    const status = buildCurrentStatus(
      t,
      {
        status: "degraded",
        version: "0.7.0",
        git_sha: null,
        checks: {
          llm_provider: { status: "unhealthy", latency_ms: null },
          postgres: { status: "ok", latency_ms: 2 },
          redis: { status: "ok", latency_ms: 1 },
        },
      },
      { isLoading: false, isError: false },
    );
    expect(status.services.map((s) => s.key)).toEqual([
      "postgres",
      "redis",
      "llm_provider",
    ]);
    expect(status.overall).toBe("degraded");
  });
});

describe("needs-action list", () => {
  it("is empty on a healthy platform — no zero rows, no all-clear rows", () => {
    // This is the whole point of splitting status from action: a fine platform
    // produces an EMPTY action list, not a screen of green tiles.
    const alerts = buildAlerts(
      t,
      f,
      reliability(),
      cost(),
      tenant(),
      HEALTHY_STATUS,
      7,
    );
    expect(alerts).toEqual([]);
  });

  it("omits metrics with no data rather than reporting them as clean", () => {
    const alerts = buildAlerts(
      t,
      f,
      reliability({ jobFailureRatePct: null, jobsTerminal: 0 }),
      cost({ aiFailureRatePct: null, aiCalls: 0 }),
      tenant(),
      HEALTHY_STATUS,
      7,
    );
    expect(alerts).toEqual([]);
  });

  it("puts a downed dependency first, above every rate", () => {
    const alerts = buildAlerts(
      t,
      f,
      reliability({ jobFailureRatePct: 40, jobSeverity: "critical" }),
      cost(),
      tenant(),
      {
        ...HEALTHY_STATUS,
        overall: "down",
        services: [
          { key: "postgres", label: "Postgres", state: "down" },
          { key: "redis", label: "Redis", state: "ok" },
        ],
      },
      7,
    );
    expect(alerts[0].key).toBe("dependency_down");
    expect(alerts[0].value).toBe("Postgres");
    // Straight to the Services tab, which names the failing dependency.
    expect(alerts[0].search).toEqual({ tab: "services" });
  });

  it("sorts critical above warning", () => {
    const alerts = buildAlerts(
      t,
      f,
      reliability({ jobFailureRatePct: 5, jobSeverity: "warn" }),
      cost({ deltaPct: 500, severity: "critical" }),
      tenant(),
      HEALTHY_STATUS,
      7,
    );
    expect(alerts.map((a) => a.severity)).toEqual(["critical", "warn"]);
  });

  it("carries a target and a CTA on every row (ADM-001)", () => {
    const alerts = buildAlerts(
      t,
      f,
      reliability({
        jobFailureRatePct: 40,
        jobsFailed: 4,
        jobsTerminal: 10,
        jobSeverity: "critical",
      }),
      cost(),
      tenant(),
      HEALTHY_STATUS,
      7,
    );
    expect(alerts).toHaveLength(1);
    for (const alert of alerts) {
      expect(alert.target).toBeTruthy();
      expect(alert.ctaLabel).toBeTruthy();
      expect(alert.to).toMatch(/^\/admin\//);
      expect(alert.detail).toBeTruthy();
    }
    // The failed-jobs alert lands on the Operations Failures tab, already
    // filtered — not on a generic page the operator has to narrow by hand.
    expect(alerts[0].to).toBe("/admin/operations");
    expect(alerts[0].search).toEqual({ tab: "failures" });
  });

  it("gives a stalled queue an age, since that is the actual evidence", () => {
    const alerts = buildAlerts(
      t,
      f,
      reliability({
        queueDepth: 3,
        queueOldestAgeSeconds: QUEUE_AGE_CRITICAL_SECONDS,
        queueSeverity: "critical",
      }),
      cost(),
      tenant(),
      HEALTHY_STATUS,
      7,
    );
    expect(alerts[0].key).toBe("queue_stalled");
    expect(alerts[0].age).toBe(`${QUEUE_AGE_CRITICAL_SECONDS}s`);
    expect(alerts[0].search).toEqual({ tab: "jobs", status: "running" });
  });

  it("does not raise inactive tenants when there are none", () => {
    expect(inactiveOrgSeverity(0)).toBe("ok");
    expect(inactiveOrgSeverity(2)).toBe("warn");
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
          to="/admin/operations"
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
    expect(link?.getAttribute("href")).toContain("/admin/operations");
  });

  it("stays visually neutral when healthy", async () => {
    renderTile({ severity: "ok", value: "0%" });
    await screen.findByText("0%");
    expect(document.querySelector("a")!.className).not.toMatch(/red|amber/);
  });

  it("goes loud when critical", async () => {
    renderTile({ severity: "critical" });
    await screen.findByText("33%");
    expect(document.querySelector("a")!.className).toMatch(/red/);
  });

  it("renders No data without pretending it is a zero", async () => {
    renderTile({ value: "No data", detail: "0 of 0 terminal jobs, last 7d" });
    expect(await screen.findByText("No data")).toBeInTheDocument();
  });
});
