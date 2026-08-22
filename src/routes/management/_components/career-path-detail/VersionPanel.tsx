import { GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { useCreatePathVersion, usePathVersions } from "@/lib/api/hooks/career-paths";
import { useFormatDate } from "@/lib/format/date";

export function VersionPanel({
  id,
  canManage,
  pathPublished,
  selectedVersionId = null,
  onSelect = () => undefined,
}: {
  id: string;
  canManage: boolean;
  pathPublished: boolean;
  selectedVersionId?: string | null;
  onSelect?: (versionId: string | null) => void;
}) {
  const versions = usePathVersions(id, true);
  const createVersion = useCreatePathVersion(id);
  const formatDate = useFormatDate();
  const { confirm, dialog } = useConfirm();
  const list = versions.data ?? [];
  const draft = list.find((version) => version.status === "draft");
  const canFork = canManage && pathPublished && !draft && list.some((v) => v.status === "published");

  async function forkVersion() {
    const accepted = await confirm({
      title: "Create a new version?",
      description: "The latest published version will be copied into a new editable draft.",
      confirmLabel: "Create version",
      cancelLabel: "Cancel",
      confirmVariant: "default",
    });
    if (!accepted) return;
    try {
      await createVersion.mutateAsync();
      onSelect(null);
      toast.success("New draft version created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a version");
    }
  }

  return (
    <aside className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-4">
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-headline font-bold text-m3-on-surface">Versions</p>
          <p className="text-xs text-m3-on-surface-variant">Select a published version to inspect it read-only.</p>
        </div>
        <GitBranch className="h-5 w-5 text-m3-primary" />
      </div>
      <div className="space-y-2">
        {versions.isLoading && <Loader2 className="h-4 w-4 animate-spin text-m3-primary" />}
        {list.map((version) => {
          const editing = version.status === "draft" && selectedVersionId === null;
          const currentPublished = !draft && selectedVersionId === null && version.id === list[0]?.id;
          const selected = selectedVersionId === version.id || editing || currentPublished;
          return (
            <button
              key={version.id}
              type="button"
              aria-label={`Version v${version.version_no} ${version.status}`}
              aria-pressed={selected}
              onClick={() => onSelect(version.status === "draft" ? null : version.id)}
              className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${selected ? "border-m3-primary bg-m3-primary-fixed/50" : "border-m3-outline-variant/40 hover:bg-m3-surface-container"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-m3-on-surface">v{version.version_no}</span>
                <span className="text-[11px] font-semibold uppercase text-m3-on-surface-variant">{version.status}</span>
              </div>
              <p className="mt-1 text-xs text-m3-on-surface-variant">{version.published_at ? formatDate(version.published_at) : "Not published"}</p>
              {version.published_by_name && <p className="mt-0.5 truncate text-xs text-m3-on-surface-variant">by {version.published_by_name}</p>}
            </button>
          );
        })}
      </div>
      {canFork && (
        <Button data-testid="version-fork-button" type="button" variant="outline" className="w-full gap-2" disabled={createVersion.isPending} onClick={() => void forkVersion()}>
          {createVersion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
          New version
        </Button>
      )}
    </aside>
  );
}
