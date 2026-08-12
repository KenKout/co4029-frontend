import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";

import {
  MaterialTypeIcon,
  materialTypeVisual,
} from "@/components/ui/material-type-icon";
import { readBucket } from "@/routes/admin/_components/stats/breakdown";

/**
 * The admin content-analytics `materials_by_type` breakdown rendered every label
 * as "—" while the counts came through fine.
 *
 * Cause: the bucket-reader looked for a label under `status` / `type` / `kind` /
 * `name`, but the API returns `material_type`. `"type" !== "material_type"`, so
 * the lookup fell through to the placeholder.
 *
 * `readBucket` now lives in `_components/stats/breakdown.ts` (a pure module,
 * importable without pulling in the router / query client / i18n).
 */

/** The exact payload the admin endpoint returned in the bug report. */
const MATERIALS_BY_TYPE = [
  { count: 3, material_type: "audio" },
  { count: 2, material_type: "docx" },
  { count: 2, material_type: "image" },
  { count: 28, material_type: "pdf" },
  { count: 2, material_type: "pptx" },
  { count: 3, material_type: "text" },
  { count: 3, material_type: "video" },
  { count: 2, material_type: "xlsx" },
];

describe("readBucket", () => {
  it("reads material_type labels (the reported bug)", () => {
    const rows = MATERIALS_BY_TYPE.map(readBucket);
    expect(rows.map((r) => r.label)).toEqual([
      "audio",
      "docx",
      "image",
      "pdf",
      "pptx",
      "text",
      "video",
      "xlsx",
    ]);
    // No row may fall back to the placeholder.
    expect(rows.some((r) => r.label === "—")).toBe(false);
  });

  it("keeps the counts intact", () => {
    expect(MATERIALS_BY_TYPE.map(readBucket).map((r) => r.count)).toEqual([
      3, 2, 2, 28, 2, 3, 3, 2,
    ]);
  });

  it("still reads the status breakdowns", () => {
    expect(readBucket({ status: "published", count: 12 })).toEqual({
      label: "published",
      count: 12,
    });
    expect(readBucket({ status: "queued", count: 0 })).toEqual({
      label: "queued",
      count: 0,
    });
  });

  it("generalises to an unknown future label key", () => {
    // The fallback is 'first string that isn't the count', so a new breakdown
    // shape doesn't need this list extended again.
    expect(readBucket({ provider_slug: "openai", count: 7 })).toEqual({
      label: "openai",
      count: 7,
    });
  });

  it("placeholders only when there genuinely is no label", () => {
    expect(readBucket({ count: 5 }).label).toBe("—");
  });

  it("does not mistake the count key for a label", () => {
    const r = readBucket({ count: 4, total: 9, material_type: "pdf" });
    expect(r.label).toBe("pdf");
  });
});

describe("MaterialTypeIcon", () => {
  it("gives every DB-allowed material type its own icon", () => {
    // Matches learning_materials_material_type_check.
    const types = [
      "video",
      "pdf",
      "code",
      "audio",
      "image",
      "docx",
      "pptx",
      "xlsx",
      "text",
    ];
    const seen = new Set<string>();
    for (const ty of types) {
      const v = materialTypeVisual(ty);
      expect(v.icon).toBeTruthy();
      seen.add(v.icon.displayName ?? v.icon.name ?? ty);
    }
    // Distinct enough to be useful — documents share FileText by design, so
    // expect most (not all) to differ.
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });

  it("falls back for an unrecognised type instead of rendering nothing", () => {
    const v = materialTypeVisual("wasm-cartridge");
    expect(v.icon).toBeTruthy();
  });

  it("is case-insensitive", () => {
    expect(materialTypeVisual("PDF").icon).toBe(materialTypeVisual("pdf").icon);
  });

  it("renders an aria-hidden chip (the label carries the meaning)", () => {
    const { container } = render(<MaterialTypeIcon materialType="pdf" />);
    const chip = container.firstElementChild;
    expect(chip).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
