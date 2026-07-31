import { describe, expect, it } from "vitest";
import { avatarInitials, avatarColor, AVATAR_COLORS } from "../avatar";

describe("avatarInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(avatarInitials("Ada Lovelace")).toBe("AL");
    expect(avatarInitials("Grace Brewster Hopper")).toBe("GB");
  });
  it("handles a single word", () => {
    expect(avatarInitials("Cher")).toBe("C");
  });
  it("uppercases when asked", () => {
    expect(avatarInitials("ada lovelace", { uppercase: true })).toBe("AL");
    expect(avatarInitials("ada lovelace")).toBe("al");
  });
  it("returns the fallback for empty / whitespace / nullish input", () => {
    expect(avatarInitials("", { fallback: "?" })).toBe("?");
    expect(avatarInitials(null, { fallback: "?" })).toBe("?");
    expect(avatarInitials(undefined)).toBe("");
  });
});

describe("avatarColor", () => {
  it("is deterministic for the same seed", () => {
    expect(avatarColor("student-123")).toBe(avatarColor("student-123"));
  });
  it("always returns a token from the palette", () => {
    for (const seed of ["a", "bb", "ccc", "id-42", ""]) {
      expect(AVATAR_COLORS).toContain(avatarColor(seed));
    }
  });
});
