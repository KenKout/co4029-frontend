import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import { useStartCourse } from "@/lib/api/hooks/career-paths";

export function useCourseLazyStart({
  courseId,
  slug,
  eligiblePathId,
  earlyStart,
}: {
  courseId: string | undefined;
  slug: string;
  eligiblePathId: string | undefined;
  earlyStart: boolean;
}) {
  const navigate = useNavigate();
  const startCourse = useStartCourse(eligiblePathId ?? "");
  const [earlyStartOpen, setEarlyStartOpen] = useState(false);

  function startCourseNow() {
    if (!courseId || !eligiblePathId) return;
    startCourse.mutate(courseId, {
      onSuccess: () => {
        setEarlyStartOpen(false);
        void navigate({ to: "/courses/$slug/learn", params: { slug } });
      },
      onError: (error) => {
        setEarlyStartOpen(false);
        toast.error(getApiErrorMessage(error, "Could not start this course"));
      },
    });
  }

  function handleStart() {
    if (earlyStart) {
      setEarlyStartOpen(true);
      return;
    }
    startCourseNow();
  }

  return {
    startCourse,
    earlyStartOpen,
    setEarlyStartOpen,
    startCourseNow,
    handleStart,
  };
}
