import { useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useArchiveCareerPath,
  usePublishCareerPath,
} from "@/lib/api/hooks/career-paths";

/**
 * Publish/archive lifecycle for the detail header: the two mutations, the
 * inline confirm state, and the toast handling.
 *
 * `t` is injected rather than resolved here so the hook adds no extra
 * `useTranslation` call — `PathActions` keeps the exact hook call order it had
 * when all of this lived inline.
 */
export function usePathActions(id: string, t: TFunction) {
  const publish = usePublishCareerPath(id);
  const archive = useArchiveCareerPath(id);
  const [confirming, setConfirming] = useState<"publish" | "archive" | null>(
    null,
  );

  function handlePublish() {
    publish.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.toasts.published"));
        setConfirming(null);
      },
      onError: (err) => {
        const e = err as { status?: number; message?: string };
        const message =
          e.status && e.status >= 400 && e.status < 500
            ? t("management_career_path_detail.errors.publish_needs_course")
            : e.message ||
              t("management_career_path_detail.errors.publish_failed");
        toast.error(message);
        setConfirming(null);
      },
    });
  }

  function handleArchive() {
    archive.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.toasts.archived"));
        setConfirming(null);
      },
      onError: (err) => {
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.archive_failed"),
        );
        setConfirming(null);
      },
    });
  }

  return {
    publish,
    archive,
    confirming,
    setConfirming,
    handlePublish,
    handleArchive,
  };
}
