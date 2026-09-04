import { GitBranch, Loader2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { useFormatDate } from "@/lib/format/date";
import {
  useOpenPolicyDraft,
  type PolicyVersionSummary,
} from "@/lib/api/hooks/policies";
import { PolicyStatusBadge } from "./PolicyStatusBadge";
import { cn } from "@/lib/utils";

/**
 * Version history rail for one policy — same layout as the Career Path
 * detail's VersionPanel: a sticky side card listing one selectable row per
 * version, each showing its number, status badge, changelog and date.
 *
 * Selecting a PUBLISHED version shows it read-only below (the parent swaps
 * the editor for a frozen preview); selecting the draft — or nothing —
 * returns to editing. "New version" forks the latest published text into a
 * fresh draft, matching the career-path fork flow.
 */
export function PolicyVersionPanel({
  versions,
  currentId,
  selectedVersionId,
  onSelect,
  canManage,
  // Shared action bar — the panel and the actions are ONE sticky section.
  actionsDirty,
  onSave,
  onPublish,
  savePending,
  publishPending,
  canPublish,
}: {
  versions: PolicyVersionSummary[];
  /** The version the main column is currently showing (draft or latest published). */
  currentId: string | null;
  selectedVersionId: string | null;
  onSelect: (versionId: string | null) => void;
  canManage: boolean;
  actionsDirty: boolean;
  onSave: () => void;
  onPublish: () => void;
  savePending: boolean;
  publishPending: boolean;
  canPublish: boolean;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const openDraft = useOpenPolicyDraft("");
  const { confirm, dialog } = useConfirm();

  const list = versions;
  const draft = list.find((v) => v.status === "draft");
  const canFork =
    canManage && !draft && list.some((v) => v.status === "published");

  async function forkVersion() {
    const accepted = await confirm({
      title: t("admin.policies.fork_confirm_title"),
      description: t("admin.policies.fork_confirm_body"),
      confirmLabel: t("admin.policies.actions.new_draft"),
      cancelLabel: t("admin.policies.actions.cancel"),
      confirmVariant: "default",
    });
    if (!accepted) return;
    try {
      await openDraft.mutateAsync({});
      onSelect(null);
      toast.success(t("admin.policies.toasts.draft_opened"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("admin.policies.toasts.draft_failed"),
      );
    }
  }

  return (
    <aside className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-4">
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("admin.policies.versions_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant">
            {t("admin.policies.versions_hint")}
          </p>
        </div>
        <GitBranch className="h-5 w-5 text-m3-primary" />
      </div>

      {/* Shared Save/Publish for the whole workspace (draft text + audience),
          merged into this panel so there is exactly one sticky section. */}
      <div className="flex items-center gap-2 border-t border-m3-outline-variant/20 pt-3">
        <span className={cn("mr-auto text-xs font-semibold", actionsDirty ? "text-amber-700" : "text-m3-on-surface-variant/60")}>
          {actionsDirty
            ? t("admin.policies.unsaved_dot")
            : t("admin.policies.saved_dot")}
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={!actionsDirty || savePending || publishPending}
          onClick={onSave}
        >
          {savePending
            ? t("admin.policies.actions.saving")
            : t("admin.policies.actions.save")}
        </Button>
        <Button
          type="button"
          className="gap-2"
          disabled={savePending || publishPending || !canPublish}
          onClick={onPublish}
        >
          <Send className="h-4 w-4" />
          {publishPending
            ? t("admin.policies.actions.publishing")
            : t("admin.policies.actions.publish")}
        </Button>
      </div>

      <div className="space-y-2">
        {list.map((version) => {
          const editing = version.status === "draft" && selectedVersionId === null;
          const currentPublished =
            !draft && selectedVersionId === null && version.id === list[0]?.id;
          const selected =
            selectedVersionId === version.id || editing || currentPublished;
          const showing = currentId === version.id;
          return (
            <VersionRow
              key={version.id}
              version={version}
              selected={selected}
              showing={showing}
              onSelect={onSelect}
              formatDate={formatDate}
            />
          );
        })}
      </div>

      {canFork && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={openDraft.isPending}
          onClick={() => void forkVersion()}
        >
          {openDraft.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitBranch className="h-4 w-4" />
          )}
          {t("admin.policies.actions.new_draft")}
        </Button>
      )}
    </aside>
  );
}

/** One selectable row in the version list. */
function VersionRow({
  version,
  selected,
  showing,
  onSelect,
  formatDate,
}: {
  version: PolicyVersionSummary;
  selected: boolean;
  showing: boolean;
  onSelect: (versionId: string | null) => void;
  formatDate: ReturnType<typeof useFormatDate>;
}) {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      type="button"
      aria-label={`v${version.version_no} ${version.status}`}
      aria-pressed={selected}
      onClick={() => onSelect(version.status === "draft" ? null : version.id)}
      className={cn(
        "h-auto w-full cursor-pointer rounded-lg border p-3 text-left whitespace-normal",
        selected
          ? "border-m3-primary bg-m3-primary-fixed/50"
          : "border-m3-outline-variant/40 hover:bg-m3-surface-container",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-m3-on-surface">
          v{version.version_no}
        </span>
        {/* v-number is already the row's left label; the badge
            carries just the status. */}
        <PolicyStatusBadge status={version.status} />
      </div>
      {version.changelog ? (
        <p className="mt-1 truncate text-xs text-m3-on-surface-variant">
          {version.changelog}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-m3-on-surface-variant">
        {version.status === "draft"
          ? formatDate(version.updated_at)
          : version.published_at
            ? formatDate(version.published_at)
            : "—"}
        {showing ? ` · ${t("admin.policies.versions_current")}` : ""}
      </p>
    </Button>
  );
}
