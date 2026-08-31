import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/use-confirm";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useCreateCareerPath, useManagedCareerPath, usePathVersions } from "@/lib/api/hooks/career-paths";
import { CoursesTab } from "@/routes/management/_components/career-path-detail/CoursesTab";
import { EditForm } from "@/routes/management/_components/career-path-detail/EditForm";
import { LoadErrorBox } from "@/routes/management/_components/career-path-detail/LoadErrorBox";
import { PathHeaderBar } from "@/routes/management/_components/career-path-detail/PathHeaderBar";
import { PathImpactBanner } from "@/routes/management/_components/career-path-detail/PathImpactBanner";
import { ProgramsTab } from "@/routes/management/_components/career-path-detail/ProgramsTab";
import { ProgressTab } from "@/routes/management/_components/career-path-detail/ProgressTab";
import { StudentsTab } from "@/routes/management/_components/career-path-detail/StudentsTab";
import { TabBar } from "@/routes/management/_components/career-path-detail/TabBar";
import { VersionPanel } from "@/routes/management/_components/career-path-detail/VersionPanel";
import type { TabKey } from "@/routes/management/_components/career-path-detail/types";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Deep-linked from a course's Career Paths tab (tab=courses&stage=<id>):
 * once the Courses tab has rendered, scroll the named stage into view.
 */
function useStageScroll(tab: TabKey, stageId?: string) {
  useEffect(() => {
    if (tab !== "courses" || !stageId) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`cp-stage-${stageId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 350);
    return () => window.clearTimeout(t);
  }, [tab, stageId]);
}

export default function ManagementCareerPathDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  if (id === "new") return <NewCareerPathWorkspace />;
  return <ExistingCareerPathWorkspace id={id} />;
}

function ExistingCareerPathWorkspace({ id }: { id: string }) {
  const permissions = usePermissions();
  const canRead = permissions.hasAny("course.read", "system.administer");
  const canManage = permissions.hasAny("course.create", "course.update", "system.administer");
  const path = useManagedCareerPath(!permissions.isLoading && canRead ? id : undefined);
  const versions = usePathVersions(id, canRead);
  const search = useSearch({ strict: false }) as { tab?: TabKey; stage?: string };
  const [tab, setTab] = useState<TabKey>(search.tab ?? "general");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const readOnly = selectedVersionId !== null;
  const hasDraft = (versions.data ?? []).some((version) => version.status === "draft");
  const editable = canManage && hasDraft && !readOnly;

  useStageScroll(tab, search.stage);

  if (!permissions.isLoading && !canRead) return <PermissionDenied />;
  if (permissions.isLoading || path.isLoading) return <PageSkeleton rows={3} rounded="rounded-lg" className="pb-12" />;
  if (path.isError || !path.data) return <LoadErrorBox message="Could not load the Career Path." />;

  return (
    <WorkspaceShell
      id={id}
      data={path.data}
      tab={tab}
      onSelectTab={setTab}
      editable={editable}
      readOnly={readOnly}
      canManage={canManage}
      hasDraft={hasDraft}
      selectedVersionId={selectedVersionId}
      onSelectVersion={setSelectedVersionId}
    />
  );
}

/** Everything below the permission/loading guards. */
function WorkspaceShell({
  id,
  data,
  tab,
  onSelectTab,
  editable,
  readOnly,
  canManage,
  hasDraft,
  selectedVersionId,
  onSelectVersion,
}: {
  id: string;
  data: NonNullable<ReturnType<typeof useManagedCareerPath>["data"]>;
  tab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  editable: boolean;
  readOnly: boolean;
  canManage: boolean;
  hasDraft: boolean;
  selectedVersionId: string | null;
  onSelectVersion: (id: string | null) => void;
}) {
  return (
    <div className="space-y-6 pb-16">
      <PathHeaderBar
        id={id}
        data={data}
        canManage={canManage && !readOnly}
        hasDraft={hasDraft}
      />
      {readOnly && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Viewing a frozen version. Select the draft/current version to continue editing.
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-5 lg:col-span-7">
          <TabBar tab={tab} onSelect={onSelectTab} />
          {editable && data.status === "published" && <PathImpactBanner id={id} />}
          <TabContent
            tab={tab}
            id={id}
            editable={editable}
            versionId={selectedVersionId ?? undefined}
            path={{ name: data.name, slug: data.slug, description: data.description }}
          />
        </main>
        <div className="lg:col-span-3 lg:sticky lg:top-24">
          <VersionPanel
            id={id}
            canManage={canManage}
            pathPublished={data.status === "published"}
            selectedVersionId={selectedVersionId}
            onSelect={onSelectVersion}
          />
        </div>
      </div>
    </div>
  );
}

/** The tab body — one branch per tab keeps the workspace shell small. */
function TabContent({
  tab,
  id,
  editable,
  versionId,
  path,
}: {
  tab: TabKey;
  id: string;
  editable: boolean;
  versionId?: string;
  path: { name: string; slug: string; description: string | null | undefined };
}) {
  if (tab === "general") {
    return (
      <EditForm
        id={id}
        initialName={path.name}
        initialSlug={path.slug}
        initialDescription={path.description ?? ""}
        readOnly={!editable}
      />
    );
  }
  if (tab === "programs") return <ProgramsTab pathId={id} />;
  if (tab === "courses") {
    return <CoursesTab id={id} canManage={editable} versionId={versionId} />;
  }
  return (
    <div className="space-y-6">
      <StudentsTab id={id} canEnroll={false} canUnenroll={false} />
      <ProgressTab id={id} />
    </div>
  );
}

function NewCareerPathWorkspace() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const create = useCreateCareerPath();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  if (!permissions.isLoading && !permissions.hasAny("course.create", "course.update")) return <PermissionDenied />;

  async function createDraft() {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    const accepted = await confirm({
      title: "Create Career Path draft?",
      description: "A draft v1 will be created with the information in General.",
      confirmLabel: "Create draft",
      cancelLabel: "Cancel",
      confirmVariant: "default",
    });
    if (!accepted) return;
    try {
      const path = await create.mutateAsync({ name: name.trim(), slug: slug.trim(), description: description.trim() || null });
      toast.success("Career Path draft created");
      void navigate({ to: "/management/career-paths/$id", params: { id: path.id }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the Career Path");
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {dialog}
      <header className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="min-w-0">
          <h1 className="truncate font-headline text-2xl font-bold text-m3-on-surface">{name || "New Career Path"}</h1>
          <p className="mt-0.5 truncate font-mono text-xs text-m3-on-surface-variant">{slug || "career-path-slug"}</p>
        </div>
        <Button type="button" className="gap-2" disabled={create.isPending} onClick={() => void createDraft()}>
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create draft
        </Button>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-5 lg:col-span-7">
          <TabBar tab="general" onSelect={() => undefined} />
          <section className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Name <span className="text-red-600">*</span><Input autoFocus value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!slugTouched) setSlug(slugify(value)); }} /></label>
              <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Slug <span className="text-red-600">*</span><Input className="font-mono" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} /></label>
            </div>
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description<Textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          </section>
        </main>
        <aside className="rounded-xl border border-dashed border-m3-outline-variant p-5 text-sm text-m3-on-surface-variant lg:col-span-3">Version history becomes available after the draft is created.</aside>
      </div>
    </div>
  );
}