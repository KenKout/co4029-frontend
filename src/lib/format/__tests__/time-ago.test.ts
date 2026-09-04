import { describe, expect, it } from "vitest";
import { timeAgo } from "../time-ago";

const NOW = Date.now();
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it("collapses anything under a minute to the just-now label", () => {
    expect(timeAgo(ago(5), "en", { justNow: "just now" })).toBe("just now");
    expect(timeAgo(ago(59), "en", { justNow: "just now" })).toBe("just now");
  });

  it("treats a future timestamp (clock skew) as just now", () => {
    expect(
      timeAgo(new Date(NOW + 4000).toISOString(), "en", { justNow: "just now" }),
    ).toBe("just now");
  });

  it("picks the largest fitting unit", () => {
    expect(timeAgo(ago(5 * 60), "en")).toBe("5 minutes ago");
    expect(timeAgo(ago(3 * 3600), "en")).toBe("3 hours ago");
    expect(timeAgo(ago(2 * 86_400), "en")).toBe("2 days ago");
    expect(timeAgo(ago(3 * 604_800), "en")).toBe("3 weeks ago");
  });

  it("uses numeric:auto wording at the boundary", () => {
    // "yesterday", not "1 day ago" — Intl's numeric:auto behaviour, asserted so
    // a future switch to numeric:always is a deliberate change, not a surprise.
    expect(timeAgo(ago(86_400), "en")).toBe("yesterday");
  });

  it("localises without per-unit translation keys", () => {
    const vi = timeAgo(ago(5 * 60), "vi");
    expect(vi).toBeTruthy();
    expect(vi).not.toBe("5 minutes ago");
  });

  it("returns null for an unparseable timestamp so callers can fall back", () => {
    expect(timeAgo("not-a-date", "en")).toBeNull();
  });

  it("falls back to English for an invalid locale tag instead of throwing", () => {
    expect(timeAgo(ago(5 * 60), "not a locale!!")).toBe("5 minutes ago");
  });
});
