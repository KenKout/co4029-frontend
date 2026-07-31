import { describe, expect, it } from "vitest";
import {
  statusToken,
  STATUS_FALLBACK,
  USER_STATUS_TOKENS,
  ORG_STATUS_TOKENS,
} from "../status-tokens";

describe("statusToken", () => {
  it("returns the mapped token for a known status", () => {
    expect(statusToken(USER_STATUS_TOKENS, "active")).toBe(
      "bg-emerald-100 text-emerald-700",
    );
  });
  it("returns the shared slate fallback for unknown / empty status", () => {
    expect(statusToken(USER_STATUS_TOKENS, "nonsense")).toBe(STATUS_FALLBACK);
    expect(statusToken(USER_STATUS_TOKENS, undefined)).toBe(STATUS_FALLBACK);
  });
  it("preserves per-domain colour differences (inactive: red for users, amber for orgs)", () => {
    // This is the whole reason the maps stayed separate rather than merging.
    expect(statusToken(USER_STATUS_TOKENS, "inactive")).toBe(
      "bg-red-100 text-red-700",
    );
    expect(statusToken(ORG_STATUS_TOKENS, "inactive")).toBe(
      "bg-amber-100 text-amber-700",
    );
  });
});
