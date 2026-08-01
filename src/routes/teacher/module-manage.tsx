import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
  useUpdateModule,
  useReorderModuleItems,
  useDeleteModuleItem,
} from "@/lib/api/hooks/teacher-courses";
import type { CourseContentModule } from "@/lib/api/types/common";
import { CurriculumItemsCard } from "./_components/module-manage/CurriculumItemsCard";
import { DeleteItemDialog } from "./_components/module-manage/DeleteItemDialog";
import { ModuleHeader } from "./_components/module-manage/ModuleHeader";
import { ModuleSettings } from "./_components/module-manage/ModuleSettings";
import { useItemDelete } from "./_components/module-manage/use-item-delete";
import { useItemReorder } from "./_components/module-manage/use-item-reorder";
import { useModuleTitleEdit } from "./_components/module-manage/use-module-title-edit";

/**
 * Teacher module workspace: rename/publish the module, reorder + delete its
 * curriculum items, add new content, and edit its settings.
 *
 * Thin orchestrator — data fetching, page state and composition only. The
 * curriculum row, the add-content pills, the settings sidebar and the header
 * live in `_components/module-manage/`.
 */
export default function ModuleManagePage() {
  const { t } = useTranslation();
  const { courseId, moduleId } = useParams({ strict: false }) as {
    courseId: string;
    moduleId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: content, isLoading } = useTeacherCourseContent(courseId);

  const module: CourseContentModule | undefined = content?.modules.find(
    (m) => m.id === moduleId,
  );

  const updateModule = useUpdateModule(moduleId, courseId);
  const reorderItems = useReorderModuleItems(moduleId, courseId);
  const deleteItem = useDeleteModuleItem(courseId);

  const titleEdit = useModuleTitleEdit({ module, updateModule });
  const reorder = useItemReorder({ reorderItems });
  const itemDelete = useItemDelete({ deleteItem, t });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant">
        Module not found.{" "}
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="text-m3-primary hover:underline"
        >
          Back to course
        </Link>
      </div>
    );
  }

  const sortedItems = [...(module.items ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="space-y-6 pb-12">
      <ModuleHeader
        module={module}
        course={course}
        courseId={courseId}
        itemCount={sortedItems.length}
        updateModule={updateModule}
        titleEdit={titleEdit}
        t={t}
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-8">
          <CurriculumItemsCard
            sortedItems={sortedItems}
            courseId={courseId}
            moduleId={moduleId}
            reorder={reorder}
            onDelete={(item, title) =>
              itemDelete.setPendingDelete({ id: item.id, title })
            }
          />
        </div>

        <aside className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 self-start">
          <ModuleSettings module={module} courseId={courseId} />
        </aside>
      </div>

      <DeleteItemDialog itemDelete={itemDelete} deleteItem={deleteItem} t={t} />
    </div>
  );
}
