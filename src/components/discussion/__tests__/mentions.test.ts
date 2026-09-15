import { describe, expect, it } from "vitest";

import { splitLeadingMention } from "../DiscussionThreadDialog";

describe("splitLeadingMention", () => {
  it("matches a complete display name containing spaces", () => {
    expect(
      splitLeadingMention("@Hải Lê Cảm ơn bạn", ["Hải", "Hải Lê"]),
    ).toEqual({ mention: "@Hải Lê", remainder: " Cảm ơn bạn" });
  });

  it("uses a name boundary instead of matching a shorter prefix", () => {
    expect(splitLeadingMention("@Hải Lê Minh phản hồi", ["Hải Lê"])).toEqual({
      mention: "@Hải Lê",
      remainder: " Minh phản hồi",
    });
    expect(splitLeadingMention("@Hải Lên tiếng", ["Hải Lê"])).toEqual({
      mention: "@Hải",
      remainder: " Lên tiếng",
    });
  });

  it("keeps the single-token fallback for unavailable historical users", () => {
    expect(splitLeadingMention("@FormerUser hello", [])).toEqual({
      mention: "@FormerUser",
      remainder: " hello",
    });
  });
});
