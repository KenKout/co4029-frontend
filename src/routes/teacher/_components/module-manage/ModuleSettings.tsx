import type { CourseContentModule } from "@/lib/api/types/common";
import { ModuleSettingsForm } from "./ModuleSettingsForm";
import { ModuleStatsCard } from "./ModuleStatsCard";
import { useModuleSettings } from "./use-module-settings";

/**
 * Right-hand sidebar of the module workspace: item stats above the editable
 * description / duration form. Extracted from the former 887-line
 * `module-manage.tsx` with its markup unchanged.
 */
export function ModuleSettings({
  module,
  courseId,
}: {
  module: CourseContentModule;
  courseId: string;
}) {
  const ctl = useModuleSettings({ module, courseId });

  return (
    <div className="space-y-5">
      <ModuleStatsCard module={module} />
      <ModuleSettingsForm ctl={ctl} />
    </div>
  );
}
