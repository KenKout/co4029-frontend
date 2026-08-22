import { describe, expect, it } from "vitest";

import { boundsFromCustomRange, filterNotifications } from "../helpers";
import { boundsFromCustom } from "@/routes/admin/_components/processing/use-admin-processing";

const NOW = "2026-08-08T12:00:00.000Z";

describe("boundsFromCustom / boundsFromCustomRange (custom time range)", () => {
  it("maps a from date to a UTC-midnight lower bound", () => {
    const { since, until } = boundsFromCustom({ from: "2026-08-01" });
    expect(since).toBe("2026-08-01T00:00:00.000Z");
    expect(until).toBeUndefined();
  });

  it("makes the to date inclusive by pushing the upper bound to +1 day", () => {
    const { since, until } = boundsFromCustomRange({ from: "2026-08-01", to: "2026-08-15" });
    expect(since).toBe("2026-08-01T00:00:00.000Z");
    expect(until).toBe("2026-08-16T00:00:00.000Z");
  });

  it("falls back to the epoch when no from date is picked", () => {
    expect(boundsFromCustom(undefined).since).toBe("1970-01-01T00:00:00.000Z");
    expect(boundsFromCustom({ to: "2026-08-15" }).since).toBe(
      "1970-01-01T00:00:00.000Z",
    );
  });
});

describe("filterNotifications custom-range bounds", () => {
  const items = [
    { id: "a", title: "old", created_at: "2026-07-01T00:00:00.000Z", read_at: null, category: "system" },
    { id: "b", title: "mid", created_at: "2026-08-05T12:00:00.000Z", read_at: null, category: "system" },
    { id: "c", title: "new", created_at: "2026-08-08T08:00:00.000Z", read_at: null, category: "system" },
  ] as const;

  it("keeps only rows inside the from/to window", () => {
    const out = filterNotifications(items as never, {
      search: "",
      since: "1970-01-01T00:00:00.000Z",
      until: "2026-08-08T00:00:00.000Z",
    });
    expect(out.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("ignores the upper bound when none is provided", () => {
    const out = filterNotifications(items as never, {
      search: "",
      since: "2026-08-01T00:00:00.000Z",
    });
    expect(out.map((n) => n.id)).toEqual(["b", "c"]);
  });

  it("the shared bounds helper and the client filter agree on inclusivity", () => {
    const { since, until } = boundsFromCustomRange({ from: "2026-08-01", to: "2026-08-08" });
    const out = filterNotifications(items as never, { search: "", since, until });
    // "new" is at 08:00 on the 8th — inside [Aug 1, Aug 9) — so it survives.
    expect(out.map((n) => n.id)).toEqual(["b", "c"]);
    void NOW;
  });
});
