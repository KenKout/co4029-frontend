import { useState } from "react";
import { toast } from "sonner";
import { useUpdateModule } from "@/lib/api/hooks/teacher-courses";
import type { CourseContentModule } from "@/lib/api/types/common";

/**
 * Settings draft for the module sidebar: description + estimated duration and
 * the save submit handler. Extracted from the former `ModuleSettings` in
 * `module-manage.tsx`; hook call order (`useUpdateModule`, then the three
 * `useState`s) is preserved exactly.
 */
export function useModuleSettings(options: {
  module: CourseContentModule;
  courseId: string;
}) {
  const { module, courseId } = options;
  const updateModule = useUpdateModule(module.id, courseId);
  const [description, setDescription] = useState(module.description ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    module.estimated_minutes?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateModule.mutateAsync({
        description: description.trim() || undefined,
        estimated_minutes: estimatedMinutes
          ? Number(estimatedMinutes)
          : undefined,
      });
      toast.success("Module settings saved");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return {
    description,
    setDescription,
    estimatedMinutes,
    setEstimatedMinutes,
    saving,
    handleSave,
  };
}

export type ModuleSettingsController = ReturnType<typeof useModuleSettings>;
