import { GitBranch, Loader2 } from "lucide-react";
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
}: {
  versions: PolicyVersionSummary[];
  /** The version the main column is currently showing (draft or latest published). */
  currentId: string | null;
  selectedVersionId: string | null;
  onSelect: (versionId: string | null) => void;
  canManage: boolean;
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

      <div className="space-y-2">
        {list.map((version) => {
          const editing = version.status === "draft" && selectedVersionId === null;
          const currentPublished =
            !draft && selectedVersionId === null && version.id === list[0]?.id;
          const selected =
            selectedVersionId === version.id || editing || currentPublished;
          const showing = currentId === version.id;
          return (
            <Button
              key={version.id}
              variant="ghost"
              type="button"
              aria-label={`v${version.version_no} ${version.status}`}
              aria-pressed={selected}
              onClick={() =>
                onSelect(version.status === "draft" ? null : version.id)
              }
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
