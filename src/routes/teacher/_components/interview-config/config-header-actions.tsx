/**
 * The action cluster in the interview-config header: the primary Publish button,
 * the Unpublish escape hatch, and the overflow menu holding the rare /
 * destructive actions.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). Kept beside `config-header.tsx` rather than inside it because
 * the publish button's title/icon/label branches and the menu's per-item pending
 * states are the two densest branch clusters on the page.
 */

import { useTranslation } from "react-i18next";
import {
  Archive,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** In-flight state of every mutation the header can trigger. */
export interface ConfigActionPending {
  publish: boolean;
  unpublish: boolean;
  archive: boolean;
  unarchive: boolean;
  remove: boolean;
}

/** Callbacks for every mutation the header can trigger. */
export interface ConfigActionHandlers {
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onRequestDelete: () => void;
}

export function ConfigHeaderActions({
  approvedCount,
  isPublished,
  isArchived,
  publishDisabled,
  pending,
  handlers,
}: {
  approvedCount: number;
  isPublished: boolean;
  isArchived: boolean;
  publishDisabled: boolean;
  pending: ConfigActionPending;
  handlers: ConfigActionHandlers;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap shrink-0">
      <Button
        type="button"
        disabled={publishDisabled}
        onClick={handlers.onPublish}
        className={cn(
          "gap-2 border-0 shadow-glass",
          isPublished
            ? "bg-emerald-600 text-white hover:bg-emerald-600 cursor-default"
            : "bg-m3-primary text-white hover:bg-m3-primary/90",
        )}
        title={
          isArchived
            ? t("teacher_interview_config.errors.publish_blocked_archived")
            : approvedCount === 0
              ? t("teacher_interview_config.errors.questions_required")
              : isPublished
                ? t("teacher_interview_config.status.published")
                : t("teacher_interview_config.actions.publish_label")
        }
      >
        {pending.publish ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPublished ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isPublished
          ? t("teacher_interview_config.status.published")
          : t("teacher_interview_config.actions.publish_short")}
      </Button>
      {isPublished && (
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-700"
          onClick={handlers.onUnpublish}
          disabled={pending.unpublish}
          title={t("teacher_interview_config.actions.unpublish_label")}
        >
          {pending.unpublish ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 rotate-180" />
          )}
          {t("teacher_interview_config.actions.unpublish_short")}
        </Button>
      )}
      {/* Rare / destructive actions (archive, unarchive, delete) live in
          an overflow menu so they don't compete with the primary Publish
          action. */}
      <ConfigOverflowMenu
        isArchived={isArchived}
        pending={pending}
        handlers={handlers}
      />
    </div>
  );
}

function ConfigOverflowMenu({
  isArchived,
  pending,
  handlers,
}: {
  isArchived: boolean;
  pending: ConfigActionPending;
  handlers: ConfigActionHandlers;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title={t("teacher_interview_config.actions.more_tooltip")}
            aria-label={t("teacher_interview_config.actions.more_tooltip")}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        {!isArchived && (
          <DropdownMenuItem
            onClick={handlers.onArchive}
            disabled={pending.archive}
            className="gap-2"
          >
            {pending.archive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {t("teacher_interview_config.actions.archive")}
          </DropdownMenuItem>
        )}
        {isArchived && (
          <DropdownMenuItem
            onClick={handlers.onUnarchive}
            disabled={pending.unarchive}
            className="gap-2"
          >
            {pending.unarchive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 rotate-180" />
            )}
            {t("teacher_interview_config.actions.unarchive")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handlers.onRequestDelete}
          disabled={pending.remove}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
