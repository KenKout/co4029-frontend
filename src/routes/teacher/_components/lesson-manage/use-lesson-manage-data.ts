import { useNavigate } from "@tanstack/react-router";
import {
  useTeacherLesson,
  useUpdateLesson,
  useTeacherCourseById,
  useTeacherCourseContent,
  useTeacherLessonResources,
  useCreateLessonResource,
  useDeleteLessonResource,
  useDeleteLesson,
  useUpdateModuleItem,
} from "@/lib/api/hooks/teacher-courses";
import {
  useTeacherRequestUploadUrl,
  useCreateMaterial,
  useTeacherMaterialStreamUrl,
  useInitMaterialUpload,
  useCompleteMaterialUpload,
  useTeacherLessonMaterials,
  useBulkSetMaterialVisibility,
} from "@/lib/api/hooks/materials";

/**
 * Every server read/write the lesson editor needs, plus the values derived
 * straight from them (parent module, this lesson's module item, the sibling
 * lesson list that backs the prerequisite picker).
 *
 * Hook order here mirrors the order the page used to call them in — the query
 * hooks first, then the ones that depend on `moduleId` / `lesson`.
 */
export function useLessonManageData(courseId: string, lessonId: string) {
  const { data: course } = useTeacherCourseById(courseId);
  const { data: lesson, isLoading: lessonLoading } = useTeacherLesson(lessonId);
  const { data: content } = useTeacherCourseContent(courseId);
  const { data: resources = [] } = useTeacherLessonResources(lessonId);
  const updateLesson = useUpdateLesson(lessonId, courseId);
  const requestUpload = useTeacherRequestUploadUrl();
  const createResource = useCreateLessonResource(lessonId);
  const deleteResource = useDeleteLessonResource(lessonId);

  const moduleId = lesson?.module_id ?? "";
  const courseModule = (content?.modules ?? []).find((m) => m.id === moduleId);
  const createMaterial = useCreateMaterial(courseId, moduleId, lessonId);
  const { data: aiMaterials = [] } = useTeacherLessonMaterials(lessonId);
  const bulkSetVisibility = useBulkSetMaterialVisibility(lessonId);
  const initVideoUpload = useInitMaterialUpload(lessonId);
  const completeVideoUpload = useCompleteMaterialUpload();
  const { data: videoStreamData } = useTeacherMaterialStreamUrl(
    lesson?.primary_material_id,
  );
  const deleteLesson = useDeleteLesson(courseId);
  const updateModuleItem = useUpdateModuleItem(courseId);
  const navigate = useNavigate();

  /* ── Find this lesson's module item (for unlock_rule_json / prerequisites) ── */
  const moduleItem = (content?.modules ?? [])
    .flatMap((m) => m.items)
    .find((i) => i.lesson_id === lessonId);

  /* ── All lessons in the course (for prerequisite picker) ──
     The teacher content payload carries each item's data under `item.target`
     (NOT `item.lesson`, which is only populated on the public/learner payload).
     Reading `item.lesson` here left the picker permanently empty — the actual
     bug behind "prerequisites not working". Build from `target` instead. */
  const allLessons: { id: string; title: string; lesson_type: string }[] = (
    content?.modules ?? []
  ).flatMap((m) =>
    m.items
      .filter(
        (i) =>
          i.item_type === "lesson" &&
          i.target != null &&
          i.target.id !== lessonId,
      )
      .map((i) => ({
        id: i.target!.id,
        title: i.target!.title,
        lesson_type: i.target!.lesson_type ?? "video",
      })),
  );

  return {
    courseId,
    lessonId,
    course,
    lesson,
    lessonLoading,
    resources,
    updateLesson,
    requestUpload,
    createResource,
    deleteResource,
    moduleId,
    courseModule,
    createMaterial,
    aiMaterials,
    bulkSetVisibility,
    initVideoUpload,
    completeVideoUpload,
    videoStreamData,
    deleteLesson,
    updateModuleItem,
    navigate,
    moduleItem,
    allLessons,
  };
}
