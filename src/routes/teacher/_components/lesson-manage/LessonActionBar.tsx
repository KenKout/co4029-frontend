import { LessonBackLink } from "./LessonBackLink";
import { LessonArchiveButton } from "./LessonArchiveButton";
import { LessonDeleteButton } from "./LessonDeleteButton";
import { LessonStatusToggleButton } from "./LessonStatusToggleButton";
import { LessonSaveButton } from "./LessonSaveButton";

/**
 * Sticky top action bar for the lesson editor: Back · Archive · Delete ·
 * Publish/Unpublish · Save. Archive and Delete use a two-click confirm (first
 * click arms the button, second executes). The Back link is intercepted while
 * the lesson is dirty so the caller's unsaved-changes guard can prompt.
 */
export function LessonActionBar({
  courseId,
  moduleId,
  isDirty,
  onBackWhileDirty,
  archiveConfirm,
  onArchive,
  onArchiveBlur,
  deleteConfirm,
  onDelete,
  onDeleteBlur,
  status,
  onToggleStatus,
  saving,
  saved,
  onSave,
}: {
  courseId: string;
  moduleId: string;
  isDirty: boolean;
  /** Invoked (instead of navigating) when Back is clicked while dirty. */
  onBackWhileDirty: () => void;
  archiveConfirm: boolean;
  onArchive: () => void;
  onArchiveBlur: () => void;
  deleteConfirm: boolean;
  onDelete: () => void;
  onDeleteBlur: () => void;
  status: "draft" | "published";
  onToggleStatus: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="sticky top-16 z-10 -mx-1 mb-8 flex items-center justify-between gap-3 border-b border-m3-outline-variant/15 bg-m3-surface/85 px-1 py-3 backdrop-blur-md">
      <LessonBackLink
        courseId={courseId}
        moduleId={moduleId}
        isDirty={isDirty}
        onBackWhileDirty={onBackWhileDirty}
      />
      <div className="flex items-center gap-2">
        <LessonArchiveButton
          archiveConfirm={archiveConfirm}
          onArchive={onArchive}
          onArchiveBlur={onArchiveBlur}
        />
        <LessonDeleteButton
          deleteConfirm={deleteConfirm}
          onDelete={onDelete}
          onDeleteBlur={onDeleteBlur}
        />
        <span className="mx-0.5 h-5 w-px bg-m3-outline-variant/30" />
        <LessonStatusToggleButton
          status={status}
          onToggleStatus={onToggleStatus}
        />
        <LessonSaveButton saving={saving} saved={saved} onSave={onSave} />
      </div>
    </div>
  );
}
