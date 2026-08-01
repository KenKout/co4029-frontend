import { useTranslation } from "react-i18next";
import { UserPlus, Users } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "./EmptyState";
import { ReadinessSnapshot } from "./ReadinessSnapshot";
import { SectionActionCard } from "./SectionActionCard";
import { StudentPickerDialog } from "./StudentPickerDialog";
import { StudentRow } from "./StudentRow";
import { useStudentsTab } from "./use-students-tab";

/** Students tab: enrol students onto the path and review their roster. */
export function StudentsTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const controller = useStudentsTab(id, t);

  return (
    <div className="space-y-6">
      <SectionActionCard
        title={t("management_career_path_detail.sections.register_student")}
        hint={t("management_career_path_detail.sections.register_student_hint")}
        icon={UserPlus}
        actionLabel={t(
          "management_career_path_detail.actions.register_students",
        )}
        onAction={() => controller.setPickerOpen(true)}
      />

      {controller.pickerOpen && <StudentPickerDialog controller={controller} />}

      {controller.readiness.data &&
        controller.readiness.data.student_count > 0 && (
          <ReadinessSnapshot data={controller.readiness.data} />
        )}

      {controller.progress.isLoading ? (
        <PageSkeleton
          rows={2}
          height="h-14"
          rounded="rounded-lg"
          gap="space-y-2"
        />
      ) : controller.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          text={t("management_career_path_detail.empty_states.no_students")}
        />
      ) : (
        <div className="space-y-2">
          {controller.rows.map((row) => (
            <StudentRow key={row.student_id} pathId={id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
