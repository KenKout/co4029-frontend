import { useTranslation } from "react-i18next";
import { EntityMultiSelectDialog } from "@/components/ui/entity-multi-select-dialog";
import type { CoursesTabController } from "./use-courses-tab";

/** Catalogue picker for attaching courses to the path. */
export function CoursePickerDialog({
  controller,
}: {
  controller: CoursesTabController;
}) {
  const { t } = useTranslation();

  return (
    <EntityMultiSelectDialog
      title={t("management_career_path_detail.course_picker.title")}
      searchPlaceholder={t(
        "management_career_path_detail.course_picker.search_placeholder",
      )}
      items={controller.courseCandidates}
      alreadySelectedIds={controller.alreadyAddedCourseIds}
      isLoading={controller.catalogue.isLoading}
      query={controller.courseQuery}
      onQueryChange={controller.setCourseQuery}
      onConfirm={controller.handleConfirmCourses}
      onClose={controller.closePicker}
      isSubmitting={controller.submitting}
      emptyText={t("management_career_path_detail.course_picker.empty")}
      alreadyAddedLabel={t("management_career_path_detail.course_picker.added")}
    />
  );
}
