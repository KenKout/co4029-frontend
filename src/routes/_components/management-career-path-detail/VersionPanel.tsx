import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCreatePathVersion,
  usePathVersions,
} from "@/lib/api/hooks/career-paths";
import { ConfirmActionBar } from "./ConfirmActionBar";

/**
 * Gap 3 (D1b pinned + D2a explicit fork) manager surface.
 *
 * Shows the path's versions (v1 published, v2 draft, ...) with their
 * status, and the "New version" fork button. A published version is FROZEN
 * — edits land on the draft; the panel says so explicitly so a 409 from
 * the backend is never a surprise.
 */
export function VersionPanel({
  id,
  canManage,
  pathPublished,
}: {
  id: string;
  canManage: boolean;
  pathPublished: boolean;
}) {
  const { t } = useTranslation();
  const [forkError, setForkError] = useState<string | null>(null);
  const [confirmingFork, setConfirmingFork] = useState(false);
  const versions = usePathVersions(id, canManage);
  const createVersion = useCreatePathVersion(id);

  if (versions.isLoading) {
    return null;
  }
  if (versions.isError || !versions.data) {
    return null;
  }

  const list = versions.data;
  const draft = list.find((v) => v.status === "draft");
  const publishedExists = list.some((v) => v.status === "published");
  const canFork = canManage && pathPublished && publishedExists && !draft;
  const latestPublished =
    list.find((v) => v.status === "published") ?? null;

  const handleFork = async () => {
    setForkError(null);
    try {
      await createVersion.mutateAsync();
      setConfirmingFork(false);
    } catch {
      setForkError(t("management_career_path_detail.versions.fork_failed"));
      setConfirmingFork(false);
    }
  };

  return (
    <div className="rounded-lg border border-m3-outline-variant bg-m3-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <GitBranch className="h-4 w-4 shrink-0 text-m3-on-surface-variant" />
          {list.map((v) => (
            <span
              key={v.id}
              title={`v${v.version_no} (${v.status})`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                v.status === "published"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              v{v.version_no}
              <span className="font-normal">
                {t(
                  `management_career_path_detail.versions.status.${v.status}`,
                )}
              </span>
            </span>
          ))}
          {list.length === 0 && (
            <span className="text-xs text-m3-on-surface-variant">
              {t("management_career_path_detail.versions.empty")}
            </span>
          )}
        </div>

        {canFork && <ForkControl
          confirming={confirmingFork}
          latestPublished={latestPublished}
          isPending={createVersion.isPending}
          onArm={() => setConfirmingFork(true)}
          onConfirm={() => {
            void handleFork();
          }}
          onCancel={() => setConfirmingFork(false)}
        />}
      </div>

      {draft && (
        <p
          data-testid="version-draft-hint"
          className="mt-2 text-xs text-amber-700"
        >
          {t("management_career_path_detail.versions.editing_draft", {
            version: draft.version_no,
          })}
        </p>
      )}
      {publishedExists && !draft && pathPublished && (
        <p className="mt-2 text-xs text-m3-on-surface-variant">
          {t("management_career_path_detail.versions.frozen_hint")}
        </p>
      )}
      {forkError && (
        <p className="mt-2 text-xs text-red-600">{forkError}</p>
      )}
    </div>
  );
}

/**
 * The D2(a) fork control: "New version" button, replaced by the inline
 * confirmation (hint + confirm/cancel) once armed. Split out so the panel
 * stays under the complexity cap.
 */
function ForkControl({
  confirming,
  latestPublished,
  isPending,
  onArm,
  onConfirm,
  onCancel,
}: {
  confirming: boolean;
  latestPublished: { version_no: number } | null;
  isPending: boolean;
  onArm: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  if (!confirming) {
    return (
      <Button
        data-testid="version-fork-button"
        variant="outline"
        size="sm"
        onClick={onArm}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <GitBranch className="h-3.5 w-3.5" />
        )}
        {t("management_career_path_detail.versions.fork")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p
        data-testid="version-fork-confirm-hint"
        className="text-xs text-m3-on-surface-variant"
      >
        {t("management_career_path_detail.versions.confirm_hint", {
          version: latestPublished?.version_no ?? 1,
        })}
      </p>
      <ConfirmActionBar
        confirmLabel={t("management_career_path_detail.versions.fork_confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isPending={isPending}
      />
    </div>
  );
}
