import { describe, expect, it } from "vitest";

import type { LearningMaterial } from "@/lib/api/types/teacher";
import { readyMaterialCount } from "../_components/lesson-manage/helpers";

function materialWithStatus(status: string): LearningMaterial {
  return {
    id: crypto.randomUUID(),
    lesson_id: crypto.randomUUID(),
    title: "Lecture video",
    material_type: "video",
    ai_processing_enabled: true,
    visible_to_students: false,
    current_version_id: crypto.randomUUID(),
    latest_version: {
      id: crypto.randomUUID(),
      material_id: crypto.randomUUID(),
      version_no: 1,
      is_current: true,
      processing_status: status,
    },
  } as LearningMaterial;
}

describe("lesson material readiness", () => {
  it("counts only versions that completed ingestion", () => {
    expect(
      readyMaterialCount([
        materialWithStatus("pending"),
        materialWithStatus("building_kg"),
        materialWithStatus("ready"),
        materialWithStatus("failed"),
      ]),
    ).toBe(1);
  });
});
