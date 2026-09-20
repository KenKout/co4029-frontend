import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import type { CourseContentModule, CourseDetail } from "@/lib/api/types/common";
import { ModuleMetaRow } from "./ModuleMetaRow";
import { ModulePublishButton } from "./ModulePublishButton";
import { ModuleTitleEditor } from "./ModuleTitleEditor";
import type { TranslateFn, UpdateModuleMutation } from "./types";
import type { ModuleTitleEditController } from "./use-module-title-edit";

/**
 * Breadcrumbs + module header row: back link, click-to-edit title, status/meta
 * summary and the publish toggle. Extracted from the former 887-line
 * `module-manage.tsx` with its markup unchanged.
 */
export function ModuleHeader({
  module,
  course,
  courseId,
  itemCount,
  updateModule,
  titleEdit,
  onDelete,
  deletePending,
  t,
}: {
  module: CourseContentModule;
  course: CourseDetail | undefined;
  courseId: string;
  itemCount: number;
  updateModule: UpdateModuleMutation;
  titleEdit: ModuleTitleEditController;
  onDelete: () => void;
  deletePending: boolean;
  t: TranslateFn;
}) {
  return (
    <>
      <Breadcrumbs
        items={[
          {
            label: t("teacher_common.breadcrumb_teaching"),
            to: "/teacher/courses",
          },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          { label: module.title },
        ]}
      />

      <div className="flex items-start gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <ModuleTitleEditor
            module={module}
            updateModule={updateModule}
            titleEdit={titleEdit}
          />

          <ModuleMetaRow
            module={module}
            updateModule={updateModule}
            itemCount={itemCount}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ModulePublishButton
            module={module}
            courseStatus={course?.status ?? "draft"}
            updateModule={updateModule}
          />
          {module.status === "draft" && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={onDelete}
              disabled={deletePending}
            >
              {deletePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("teacher_common.delete_module")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
