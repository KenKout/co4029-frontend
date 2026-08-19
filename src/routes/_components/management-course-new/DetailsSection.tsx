import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { DurationField } from "@/components/ui/duration-field";
import type { CourseFormController } from "./use-course-form";

export function CourseDetailsSection({
  controller,
  t,
}: {
  controller: CourseFormController;
  t: TFunction;
}) {
  const { form, setForm } = controller;
  return (
    <div className="space-y-4 border-t border-m3-outline-variant/15 pt-5">
      <h2 className="text-sm font-headline font-bold text-m3-on-surface">
        {t("teacher_course_new.section_details")}
      </h2>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-m3-on-surface">
          {t("teacher_course_new.field_duration")}
        </label>
        <div className="max-w-[220px]">
          <DurationField
            value={form.estimated_minutes}
            onChange={(minutes) =>
              setForm((f) => ({ ...f, estimated_minutes: minutes }))
            }
          />
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
