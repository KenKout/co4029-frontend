import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { COURSE_STATUS_TOKENS } from "@/lib/status-tokens";
import type { CareerPathCourseAuthoring } from "@/lib/api/types";

/**
 * Shown when a publish would fail the gate: the path holds DRAFT course(s).
 * The manager decides per policy — publish them (they go live) or drop them
 * from the path — instead of hitting the backend's 409 blind.
 */
export function PublishDraftCoursesDialog({
  draftCourses,
  action,
  onPublishCourses,
  onRemoveCourses,
  onClose,
}: {
  draftCourses: CareerPathCourseAuthoring[];
  /** Which bulk action is in flight (disables everything else). */
  action: "publish" | "remove" | null;
  onPublishCourses: () => void;
  onRemoveCourses: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const prefix = "management_career_path_detail.publish_dialog";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={action === null ? onClose : undefined}
    >
      <div
        className="w-full max-w-md rounded-xl bg-m3-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-headline font-bold text-m3-on-surface">
          {t(`${prefix}.title`)}
        </h2>
        <p className="mt-1 text-sm text-m3-on-surface-variant">
          {t(`${prefix}.body`)}
        </p>

        <ul className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {draftCourses.map((c) => (
            <li
              key={c.course_id}
              className="flex items-center gap-2 text-sm text-m3-on-surface"
            >
              <span className="truncate">{c.course_title}</span>
              <StatusBadge
                status={c.course_status}
                tokens={COURSE_STATUS_TOKENS}
                label={t(
                  `management_career_path_detail.status.${c.course_status}`,
                  { defaultValue: c.course_status },
                )}
                size="sm"
                className="shrink-0"
              />
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            data-testid="publish-courses-and-path"
            onClick={onPublishCourses}
            disabled={action !== null}
            className="gap-2"
          >
            {action === "publish" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {t(`${prefix}.publish_all`)}
          </Button>
          <Button
            data-testid="remove-courses-and-publish"
            variant="outline"
            onClick={onRemoveCourses}
            disabled={action !== null}
            className="gap-2"
          >
            {action === "remove" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {t(`${prefix}.remove_all`)}
          </Button>
          <Button
            data-testid="publish-dialog-cancel"
            variant="ghost"
            onClick={onClose}
            disabled={action !== null}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
