import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import { useCourseCatalogue } from "@/lib/api/hooks/courses";
import {
  useAddCareerPathCourse,
  useCareerPathCourses,
  useReorderCareerPathCourses,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathCourseAuthoring } from "@/lib/api/types";
import {
  courseOrderChanged,
  sortCoursesByPosition,
  swapRows,
  toCourseCandidates,
} from "./helpers";

/**
 * Everything stateful behind the courses tab: the attached-course list, the
 * add + reorder mutations, the catalogue picker state and the local drag-free
 * reorder buffer.
 *
 * The hook calls below are in the exact order `CoursesTab` used to make them
 * (list -> add -> reorder -> local state -> catalogue -> derived memos), and
 * `t` is injected so no extra `useTranslation` is introduced.
 */
export function useCoursesTab(id: string, t: TFunction) {
  const list = useCareerPathCourses(id);
  const add = useAddCareerPathCourse(id);
  const reorder = useReorderCareerPathCourses(id);

  const [order, setOrder] = useState<CareerPathCourseAuthoring[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [courseQuery, setCourseQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const catalogue = useCourseCatalogue(pickerOpen);

  const baseRows = useMemo(() => sortCoursesByPosition(list.data), [list.data]);
  const rows = order ?? baseRows;
  const hasReorderChanges = useMemo(() => {
    if (!order) return false;
    return courseOrderChanged(order, baseRows);
  }, [order, baseRows]);

  // Map the catalogue to the dialog shape and filter client-side by
  // title/slug (the /courses endpoint has no q= param). Already-attached
  // courses are passed separately so the dialog shows them checked+disabled.
  const alreadyAddedCourseIds = useMemo(
    () => new Set(baseRows.map((r) => r.course_id)),
    [baseRows],
  );
  const courseCandidates: SelectableEntity[] = useMemo(
    () => toCourseCandidates(catalogue.data?.items, courseQuery),
    [catalogue.data, courseQuery],
  );

  async function handleConfirmCourses(selected: SelectableEntity[]) {
    setSubmitting(true);
    let ok = 0;
    // Backend has only a single-item add route; loop sequentially so each
    // gets an append position and one failure doesn't abort the rest.
    for (const entity of selected) {
      try {
        await add.mutateAsync({ course_id: entity.id, is_required: true });
        ok += 1;
      } catch (err) {
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.add_course_failed"),
        );
      }
    }
    setSubmitting(false);
    if (ok > 0) {
      toast.success(
        t("management_career_path_detail.toasts.courses_added", { count: ok }),
      );
      setOrder(null);
    }
    setPickerOpen(false);
    setCourseQuery("");
  }

  function move(idx: number, delta: number) {
    const target = idx + delta;
    if (target < 0 || target >= rows.length) return;
    setOrder(swapRows(rows, idx, target));
  }

  function handleSubmitReorder() {
    if (!order) return;
    reorder.mutate(
      order.map((r) => r.course_id),
      {
        onSuccess: () => {
          toast.success(
            t("management_career_path_detail.toasts.order_updated"),
          );
          setOrder(null);
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.errors.update_order_failed"),
          ),
      },
    );
  }

  function closePicker() {
    setPickerOpen(false);
    setCourseQuery("");
  }

  function removeLocally(courseId: string) {
    if (order) setOrder(order.filter((r) => r.course_id !== courseId));
  }

  return {
    list,
    add,
    reorder,
    order,
    setOrder,
    pickerOpen,
    setPickerOpen,
    courseQuery,
    setCourseQuery,
    submitting,
    catalogue,
    baseRows,
    rows,
    hasReorderChanges,
    alreadyAddedCourseIds,
    courseCandidates,
    handleConfirmCourses,
    move,
    handleSubmitReorder,
    closePicker,
    removeLocally,
  };
}

export type CoursesTabController = ReturnType<typeof useCoursesTab>;
