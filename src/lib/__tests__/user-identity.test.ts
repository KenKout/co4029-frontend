import { describe, expect, it } from "vitest";
import { getUserAvatarUrl, getUserDisplayName } from "../user-identity";

describe("user identity helpers", () => {
  it("prefers the trimmed profile display name over email", () => {
    expect(
      getUserDisplayName({
        primary_email: "student@example.edu",
        profile: { display_name: "  Nguyễn An  " },
      }),
    ).toBe("Nguyễn An");
  });

  it("falls back from a blank display name to email and then the caller label", () => {
    expect(
      getUserDisplayName({
        primary_email: "student@example.edu",
        profile: { display_name: "   " },
      }),
    ).toBe("student@example.edu");
    expect(getUserDisplayName(undefined, "Unknown user")).toBe("Unknown user");
  });

  it("returns a trimmed avatar URL or null", () => {
    expect(
      getUserAvatarUrl({ profile: { avatar_url: "  https://cdn/avatar.png " } }),
    ).toBe("https://cdn/avatar.png");
    expect(getUserAvatarUrl({ profile: { avatar_url: "" } })).toBeNull();
  });
});
