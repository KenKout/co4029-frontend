import { useTranslation } from "react-i18next";
import { EntityMultiSelectDialog } from "@/components/ui/entity-multi-select-dialog";
import type { StudentsTabController } from "./use-students-tab";

/** Directory search picker for enrolling students into the path. */
export function StudentPickerDialog({
  controller,
}: {
  controller: StudentsTabController;
}) {
  const { t } = useTranslation();

  return (
    <EntityMultiSelectDialog
      title={t("management_career_path_detail.student_picker.title")}
      searchPlaceholder={t(
        "management_career_path_detail.student_picker.search_placeholder",
      )}
      items={controller.studentCandidates}
      alreadySelectedIds={controller.alreadyEnrolledIds}
      isLoading={controller.search.isLoading}
      query={controller.studentQuery}
      onQueryChange={controller.setStudentQuery}
      onConfirm={controller.handleConfirmStudents}
      onClose={controller.closePicker}
      isSubmitting={controller.submitting}
      emptyText={t("management_career_path_detail.student_picker.empty")}
      alreadyAddedLabel={t(
        "management_career_path_detail.student_picker.added",
      )}
    />
  );
}
