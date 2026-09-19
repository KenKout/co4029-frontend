import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  uploadCareerPathThumbnail,
  useCreateCareerPath,
  useManagedCareerPath,
  usePathVersions,
} from "@/lib/api/hooks/career-paths";
import { CareerPathThumbnailField } from "@/routes/management/_components/career-path-detail/CareerPathThumbnailField";
import { CoursesTab } from "@/routes/management/_components/career-path-detail/CoursesTab";
import { EditForm } from "@/routes/management/_components/career-path-detail/EditForm";
import { LoadErrorBox } from "@/routes/management/_components/career-path-detail/LoadErrorBox";
import { PathHeaderBar } from "@/routes/management/_components/career-path-detail/PathHeaderBar";
import { PathImpactBanner } from "@/routes/management/_components/career-path-detail/PathImpactBanner";
import { ProgramsTab } from "@/routes/management/_components/career-path-detail/ProgramsTab";
import { StudentsTab } from "@/routes/management/_components/career-path-detail/StudentsTab";
import { TabBar } from "@/routes/management/_components/career-path-detail/TabBar";
import { usePathTabCounts } from "@/routes/management/_components/career-path-detail/use-tab-counts";
import { VersionPanel } from "@/routes/management/_components/career-path-detail/VersionPanel";
import type { TabKey } from "@/routes/management/_components/career-path-detail/types";
import { getApiErrorMessage } from "@/lib/api/error-codes";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  const { id } = useParams({ strict: false });
  if (!id) return null;
  if (id === "new") return <NewCareerPathWorkspace />;
  return <ExistingCareerPathWorkspace id={id} />;
}

function ExistingCareerPathWorkspace({ id }: { id: string }) {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canRead = permissions.hasAny("course.read", "system.administer");
  const canManage = permissions.hasAny(
    "course.create",
    "course.update",
    "system.administer",
  );
  const path = useManagedCareerPath(
    !permissions.isLoading && canRead ? id : undefined,
  );
  const tabCounts = usePathTabCounts(id);
  const versions = usePathVersions(id, canRead);
  const search = useSearch({ strict: false });
  const requestedTab = search.tab;
  const [tab, setTab] = useState<TabKey>(
    requestedTab === "programs" ||
      requestedTab === "courses" ||
      requestedTab === "students"
      ? requestedTab
      : "general",
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const readOnly = selectedVersionId !== null;
  const hasDraft = (versions.data ?? []).some(
    (version) => version.status === "draft",
  );
  const editable = canManage && hasDraft && !readOnly;

  useStageScroll(tab, search.stage);

  if (!permissions.isLoading && !canRead) return <PermissionDenied />;
  if (permissions.isLoading || path.isLoading)
    return <PageSkeleton rows={3} rounded="rounded-lg" className="pb-12" />;
  if (path.isError || !path.data) {
    return (
      <LoadErrorBox
        message={t("management_career_path_detail.errors.load_failed")}
      />
    );
  }

  return (
    <WorkspaceShell
      id={id}
      data={path.data}
      tab={tab}
      onSelectTab={setTab}
      tabCounts={tabCounts}
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
  tabCounts,
}: {
  id: string;
  data: NonNullable<ReturnType<typeof useManagedCareerPath>["data"]>;
  tab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  tabCounts: ReturnType<typeof usePathTabCounts>;
  editable: boolean;
  readOnly: boolean;
  canManage: boolean;
  hasDraft: boolean;
  selectedVersionId: string | null;
  onSelectVersion: (id: string | null) => void;
}) {
  const { t } = useTranslation();

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
          {t("management_career_path_detail.versions.readonly_notice")}
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-5 lg:col-span-7">
          <TabBar tab={tab} onSelect={onSelectTab} counts={tabCounts} />
          {editable && data.status === "published" && (
            <PathImpactBanner id={id} />
          )}
          <TabContent
            tab={tab}
            id={id}
            editable={editable}
            versionId={selectedVersionId ?? undefined}
            path={{
              name: data.name,
              slug: data.slug,
              description: data.description,
              thumbnailUrl: data.thumbnail_url,
            }}
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
  path: {
    name: string;
    slug: string;
    description: string | null | undefined;
    thumbnailUrl: string | null | undefined;
  };
}) {
  if (tab === "general") {
    return (
      <EditForm
        id={id}
        initialName={path.name}
        initialSlug={path.slug}
        initialDescription={path.description ?? ""}
        initialThumbnailUrl={path.thumbnailUrl}
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
    </div>
  );
}

function NewCareerPathWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const create = useCreateCareerPath();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (
    !permissions.isLoading &&
    !permissions.hasAny("course.create", "course.update")
  )
    return <PermissionDenied />;

  async function createDraft() {
    if (!name.trim() || !slug.trim()) {
      toast.error(t("management_career_path_detail.new_path.required_fields"));
      return;
    }
    const accepted = await confirm({
      title: t("management_career_path_detail.new_path.confirm_title"),
      description: t(
        "management_career_path_detail.new_path.confirm_description",
      ),
      confirmLabel: t("management_career_path_detail.actions.create_draft"),
      cancelLabel: t("management_career_path_detail.actions.cancel"),
      confirmVariant: "default",
    });
    if (!accepted) return;
    setIsSubmitting(true);
    try {
      const path = await create.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
      });
      if (thumbnail) {
        try {
          await uploadCareerPathThumbnail(path.id, thumbnail);
        } catch (error) {
          toast.error(
            t(
              "management_career_path_detail.new_path.thumbnail_upload_failed",
              {
                reason: getApiErrorMessage(
                  error,
                  t("management_career_path_detail.new_path.upload_failed"),
                ),
              },
            ),
          );
        }
      }
      toast.success(t("management_career_path_detail.new_path.created"));
      void navigate({
        to: "/management/career-paths/$id",
        params: { id: path.id },
        replace: true,
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("management_career_path_detail.new_path.create_failed"),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {dialog}
      <header className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="min-w-0">
          <h1 className="truncate font-headline text-2xl font-bold text-m3-on-surface">
            {name || t("management_career_path_detail.new_path.title")}
          </h1>
          <p className="mt-0.5 truncate font-mono text-xs text-m3-on-surface-variant">
            {slug ||
              t("management_career_path_detail.new_path.slug_placeholder")}
          </p>
        </div>
        <Button
          type="button"
          className="gap-2"
          disabled={isSubmitting}
          onClick={() => void createDraft()}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
          {t("management_career_path_detail.actions.create_draft")}
        </Button>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-5 lg:col-span-7">
          <TabBar tab="general" onSelect={() => undefined} />
          <section className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                {t("management_career_path_detail.fields.name")}{" "}
                <span className="text-red-600">*</span>
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setName(value);
                    if (!slugTouched) setSlug(slugify(value));
                  }}
                />
              </label>
              <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                {t("management_career_path_detail.fields.slug")}{" "}
                <span className="text-red-600">*</span>
                <Input mono
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(slugify(event.target.value));
                  }}
                />
              </label>
            </div>
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("management_career_path_detail.fields.description")}
              <Textarea
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <CareerPathThumbnailField
              file={thumbnail}
              onChange={setThumbnail}
              disabled={isSubmitting}
            />
          </section>
        </main>
        <aside className="rounded-xl border border-dashed border-m3-outline-variant p-5 text-sm text-m3-on-surface-variant lg:col-span-3">
          {t("management_career_path_detail.new_path.version_history_hint")}
        </aside>
      </div>
    </div>
  );
}
