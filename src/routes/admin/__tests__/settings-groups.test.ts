import { describe, expect, it } from "vitest";

import {
  GROUP_LABELS,
  GROUP_ORDER,
} from "@/routes/admin/_components/settings/constants";
import { i18nKey, unitFor } from "@/routes/admin/_components/settings/helpers";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";

function setting(key: string): RuntimeSetting {
  return {
    key,
    group: "spaced_repetition",
    type: "int",
    label: key,
    description: key,
    env_var: null,
    minimum: 0,
    maximum: 100,
    requires_reprocess: false,
    default_value: 0,
    env_value: null,
    global_value: null,
    org_value: null,
    effective_value: 0,
    source: "default",
  };
}

describe("admin settings groups", () => {
  it("exposes Learning Program limits returned by the backend registry", () => {
    expect(GROUP_ORDER).toContain("careerpath");
    expect(GROUP_LABELS.careerpath).toBe("Learning programs");
  });

  it("exposes spaced-repetition runtime controls in the existing group", () => {
    expect(GROUP_ORDER).toContain("spaced_repetition");
    expect(GROUP_LABELS.spaced_repetition).toBe("Spaced repetition");
    expect(i18nKey("spaced_repetition.interval_unit_seconds")).toBe(
      "spaced_repetition__interval_unit_seconds",
    );
    expect(i18nKey("spaced_repetition.jitter_percent")).toBe(
      "spaced_repetition__jitter_percent",
    );
  });

  it("shows the interval settings with seconds and percent units", () => {
    expect(unitFor(setting("spaced_repetition.interval_unit_seconds"))).toBe(
      "s",
    );
    expect(unitFor(setting("spaced_repetition.jitter_percent"))).toBe("%");
  });
});
