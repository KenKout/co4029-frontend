import { describe, expect, it } from "vitest";

import {
  GROUP_LABELS,
  GROUP_ORDER,
} from "@/routes/admin/_components/settings/constants";

describe("admin settings groups", () => {
  it("exposes Learning Program limits returned by the backend registry", () => {
    expect(GROUP_ORDER).toContain("careerpath");
    expect(GROUP_LABELS.careerpath).toBe("Learning programs");
  });
});
