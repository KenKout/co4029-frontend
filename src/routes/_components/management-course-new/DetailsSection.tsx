import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import type {
  CourseFormController,
  CourseLevel,
  CourseLevelOption,
} from "./use-course-form";

export function CourseDetailsSection({
  controller,
  t,
  levelOptions,
}: {
  controller: CourseFormController;
  t: TFunction;
  levelOptions: CourseLevelOption[];
}) {
  const { form, setForm } = controller;
  return (
    <div className="space-y-4 border-t border-m3-outline-variant/15 pt-5">
      <h2 className="text-sm font-headline font-bold text-m3-on-surface">
        {t("teacher_course_new.section_details")}
      </h2>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-m3-on-surface">
          {t("teacher_course_new.field_level")}
        </label>
        <div>
          <SegmentedFilter
            ariaLabel={t("teacher_course_new.field_level")}
            value={(form.level || "beginner") as CourseLevel}
            onChange={(lvl) => setForm((f) => ({ ...f, level: lvl }))}
            options={levelOptions}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-m3-on-surface">
          {t("teacher_course_new.field_duration")}
        </label>
        <div className="relative max-w-[200px]">
          <Input
            type="number"
            min="0"
            placeholder="120"
            value={form.estimated_minutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                estimated_minutes: e.target.value,
              }))
            }
            className="pr-12"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-m3-on-surface-variant">
            {t("teacher_course_new.minutes_suffix")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CourseFormActions({
  canSubmit,
  isPending,
  t,
}: {
  canSubmit: boolean;
  isPending: boolean;
  t: TFunction;
}) {
  return (
    <div className="flex gap-3 border-t border-m3-outline-variant/15 pt-5">
      <Button
        type="submit"
        disabled={!canSubmit}
        className="gap-2 transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending
          ? t("teacher_course_new.creating")
          : t("teacher_course_new.create")}
      </Button>
      <Link to="/dept">
        <Button type="button" variant="outline">
          {t("common.cancel", "Cancel")}
        </Button>
      </Link>
    </div>
  );
}
