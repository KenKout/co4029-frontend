import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AddModuleForm } from "@/routes/teacher/_components/course-manage/AddModuleForm";
import { ModuleAccordion } from "@/routes/teacher/_components/course-manage/ModuleAccordion";

import type { CourseManageController } from "./use-course-manage-controller";

/**
 * The drag-sortable ModuleAccordion list plus the add-module affordance.
 * Extracted verbatim from the former 255-line course-manage.tsx — every prop
 * passed to `ModuleAccordion` and `AddModuleForm`, and every drag handler body,
 * is unchanged.
 */
export function ModuleList({
  controller,
}: {
  controller: CourseManageController;
}) {
  const { t } = useTranslation();
  const {
    modules,
    courseId,
    openMap,
    toggleModule,
    registerModuleRef,
    modDragIdx,
    setModDragIdx,
    modDragOverIdx,
    setModDragOverIdx,
    handleModuleDrop,
    addingModule,
    setAddingModule,
  } = controller;
  return (
    <div className="space-y-3 min-w-0">
      {modules.map((module, idx) => (
        <ModuleAccordion
          key={module.id}
          module={module}
          courseId={courseId}
          open={!!openMap[module.id]}
          onToggle={() => toggleModule(module.id)}
          registerRef={registerModuleRef}
          isDragOver={modDragOverIdx === idx}
          isDragging={modDragIdx === idx}
          onDragStart={(e) => {
            setModDragIdx(idx);
            const el = e.currentTarget as HTMLElement;
            const rect = el.getBoundingClientRect();
            e.dataTransfer.setDragImage(
              el,
              e.clientX - rect.left,
              e.clientY - rect.top,
            );
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setModDragOverIdx(idx);
          }}
          onDrop={() => handleModuleDrop(idx)}
          onDragEnd={() => {
            setModDragIdx(null);
            setModDragOverIdx(null);
          }}
        />
      ))}

      {addingModule ? (
        <AddModuleForm
          courseId={courseId}
          nextPosition={modules.length + 1}
          onDone={() => setAddingModule(false)}
        />
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2 text-sm"
          onClick={() => setAddingModule(true)}
        >
          <Plus className="h-4 w-4" />
          {t("teacher_common.add_module")}
        </Button>
      )}
    </div>
  );
}
