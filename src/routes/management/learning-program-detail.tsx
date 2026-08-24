import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Archive, ArrowLeft, GitBranch, Plus, Route, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EntityMultiSelectDialog, type SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/use-confirm";
import { useAdminUsersSearch } from "@/lib/api/hooks/admin-organizations";
import {
  useArchiveLearningProgram,
  useDecidePathChange,
  useEnrollProgramStudents,
  useLearningProgramOptions,
  useLearningProgramVersion,
  useLearningProgramVersions,
  useManagedLearningProgram,
  useProgramChangeRequests,
  useProgramRoster,
  usePublishLearningProgram,
  useUpdateLearningProgram,
} from "@/lib/api/hooks/learning-programs";
import { useFormatDate } from "@/lib/format/date";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { RosterTab } from "./_components/learning-program-detail/RosterTab";
import { PathChangeRequestsSection } from "./_components/learning-program-detail/PathChangeRequests";
import { ImportStudentsDialog } from "./_components/learning-program-detail/ImportStudentsDialog";

type TabKey = "general" | "roster" | "requests";

/**
 * Three concerns that used to be stacked on one scroll: authoring the
 * program, staffing it, and reviewing switch requests. Different people do
 * them at different times, so they get tabs rather than one long column.
 *
 * The count badges make the tabs self-announcing — a dean lands here and
 * sees "Path changes 3" without opening anything.
 */
const TABS = (pending: number, enrolled: number): TabDef<TabKey>[] => [
  { key: "general", label: "General & paths", icon: Route },
  { key: "roster", label: "Students", icon: Users, count: enrolled || undefined },
  { key: "requests", label: "Path changes", icon: GitBranch, count: pending || undefined },
];

export default function ManagementLearningProgramDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const current = useManagedLearningProgram(id);
  const versions = useLearningProgramVersions(id);
  const options = useLearningProgramOptions();
  const roster = useProgramRoster(id);
  const requests = useProgramChangeRequests(id);
  const update = useUpdateLearningProgram(id);
  const publish = usePublishLearningProgram(id);
  const archive = useArchiveLearningProgram(id);
  const enroll = useEnrollProgramStudents(id);
  const decide = useDecidePathChange(id);
  const { confirm, dialog } = useConfirm();
  const formatDate = useFormatDate();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const historical = useLearningProgramVersion(id, selectedVersionId ?? undefined);
  const data = selectedVersionId ? historical.data : current.data;
  const readOnly = selectedVersionId !== null;
  const [pathPickerOpen, setPathPickerOpen] = useState(false);
  const [pathQuery, setPathQuery] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("general");
  const [studentQuery, setStudentQuery] = useState("");
  const users = useAdminUsersSearch(studentQuery, studentPickerOpen, "student");

  const pathCandidates: SelectableEntity[] = useMemo(() => {
    const needle = pathQuery.trim().toLowerCase();
    return (options.data?.career_paths ?? [])
      .filter((path) => !needle || path.name.toLowerCase().includes(needle) || path.slug?.toLowerCase().includes(needle))
      .map((path) => ({ id: path.id, primaryLabel: path.name, secondaryLabel: path.slug, selectable: path.selectable, notSelectableReason: path.not_selectable_reason }));
  }, [options.data?.career_paths, pathQuery]);
  const studentCandidates: SelectableEntity[] = (users.data ?? []).map((user) => ({ id: user.user_id, primaryLabel: user.display_name?.trim() || user.primary_email, secondaryLabel: user.primary_email }));

  if (current.isLoading || (selectedVersionId && historical.isLoading)) return <PageSkeleton rows={4} />;
  if (!data) return <p>Learning Program not found.</p>;

  const composePathIds = (extraIds: string[]) => [
    ...data.paths.map((path) => path.career_path_id),
    ...extraIds,
  ];

  async function confirmedAction(title: string, description: string, label: string, action: () => Promise<unknown>, success: string) {
    if (!(await confirm({ title, description, confirmLabel: label, cancelLabel: "Cancel", confirmVariant: label === "Archive" ? "destructive" : "default" }))) return;
    try { await action(); toast.success(success); setSelectedVersionId(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Action failed"); }
  }

  const isDraft = data.current_version.status === "draft" && !readOnly;
  const pendingRequests = (requests.data ?? []).filter((request) => request.status === "pending");
  const pendingCount = pendingRequests.length;
  const currentPaths = data.paths;

  async function removePath(pathId: string, pathName: string) {
    const accepted = await confirm({
      title: `Remove ${pathName} from this draft?`,
      description:
        "Only the current Program draft will change. Published versions and existing student enrollments keep their pinned Career Path.",
      confirmLabel: "Remove path",
      cancelLabel: "Cancel",
      confirmVariant: "destructive",
    });
    if (!accepted) return;

    try {
      await update.mutateAsync({
        career_path_ids: currentPaths
          .filter((path) => path.career_path_id !== pathId)
          .map((path) => path.career_path_id),
      });
      toast.success("Career Path removed from the draft");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the Career Path");
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {dialog}
      <Link to="/management/learning-programs" className="inline-flex items-center gap-2 text-sm font-semibold text-m3-primary"><ArrowLeft className="h-4 w-4" /> Learning Programs</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="font-headline text-3xl font-black">{data.name}</h1><span className="rounded-full bg-m3-surface-container px-3 py-1 text-xs font-semibold">{data.status}</span></div><p className="mt-1 font-mono text-xs text-m3-on-surface-variant">{data.slug}</p></div>
        {!readOnly && <div className="flex gap-2">{isDraft && <Button onClick={() => void confirmedAction("Publish this program version?", "Publishing freezes this version for new enrollments.", "Publish", () => publish.mutateAsync(), "Program published")}>Publish</Button>}{data.status !== "archived" && <Button variant="outline" className="gap-2" onClick={() => void confirmedAction("Archive this Learning Program?", "Existing enrollments continue, but new enrollments will be blocked.", "Archive", () => archive.mutateAsync(), "Program archived")}><Archive className="h-4 w-4" /> Archive</Button>}</div>}
      </header>
      {readOnly && <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Viewing frozen program v{data.current_version.version_no}. Select the draft/current version to edit.</div>}

      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-6 lg:col-span-7">
          <Tabs<TabKey>
            tabs={TABS(pendingCount, (roster.data ?? []).length)}
            value={tab}
            onChange={setTab}
            ariaLabel="Learning program sections"
          />

          {tab === "general" && (
            <>
              <ProgramGeneral key={data.current_version.id} data={data} readOnly={readOnly || !isDraft} onSave={(payload) => update.mutateAsync(payload)} />
              <section className="space-y-4 rounded-xl bg-card p-5 ghost-border">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline text-lg font-bold">Career Paths</h2><p className="text-sm text-m3-on-surface-variant">Published path versions pinned in program v{data.current_version.version_no}.</p></div>{isDraft && <Button variant="outline" className="gap-2" onClick={() => setPathPickerOpen(true)}><Plus className="h-4 w-4" /> Add Career Path</Button>}</div>
                <div className="space-y-2">
                  {data.paths.map((path) => (
                    <div
                      key={path.career_path_id}
                      className="flex items-center gap-2 rounded-xl bg-m3-surface-container p-2 transition-colors hover:bg-m3-surface-container-high"
                    >
                      <Link
                        to="/management/career-paths/$id"
                        params={{ id: path.career_path_id }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-lg p-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {path.position}. {path.name}
                          </p>
                          <p className="mt-1 text-xs text-m3-on-surface-variant">
                            Career Path v{path.career_path_version_no} · {path.status}
                          </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-m3-primary" />
                      </Link>
                      {isDraft && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${path.name}`}
                          disabled={update.isPending}
                          onClick={() => void removePath(path.career_path_id, path.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === "roster" && (
            <RosterTab
              roster={roster.data ?? []}
              canEnroll={!readOnly && data.status === "published"}
              onOpenPicker={() => setStudentPickerOpen(true)}
              onOpenImport={() => setImportOpen(true)}
            />
          )}

          {tab === "requests" && (
            <section className="space-y-4 rounded-xl bg-card p-5 ghost-border">
              <h2 className="font-headline text-lg font-bold">Path change requests</h2>
              <PathChangeRequestsSection
                requests={pendingRequests}
                roster={roster.data ?? []}
                onDecide={(request, approve) =>
                  void confirmedAction(
                    approve ? "Approve path change?" : "Reject path change?",
                    approve
                      ? "The current path is snapshotted and the student moves to the target path."
                      : "The student remains on the current path.",
                    approve ? "Approve" : "Reject",
                    () => decide.mutateAsync({ requestId: request.id, approve }),
                    approve ? "Path change approved" : "Path change rejected",
                  )
                }
              />
            </section>
          )}
        </main>

        <aside className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-4 lg:col-span-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><div><h2 className="font-headline font-bold">Versions</h2><p className="text-xs text-m3-on-surface-variant">Published history is read-only.</p></div><GitBranch className="h-5 w-5 text-m3-primary" /></div>
          <div className="space-y-2">{(versions.data ?? []).map((version) => { const editing = version.status === "draft" && !selectedVersionId; const selected = selectedVersionId === version.id || editing; return <button key={version.id} type="button" onClick={() => setSelectedVersionId(version.status === "draft" ? null : version.id)} className={`w-full cursor-pointer rounded-lg border p-3 text-left ${selected ? "border-m3-primary bg-m3-primary-fixed/50" : "border-m3-outline-variant/40 hover:bg-m3-surface-container"}`}><div className="flex justify-between"><span className="font-semibold">v{version.version_no}</span><span className="text-[11px] uppercase text-m3-on-surface-variant">{version.status}</span></div><p className="mt-1 text-xs text-m3-on-surface-variant">{version.published_at ? formatDate(version.published_at) : "Not published"}</p>{version.published_by_name && <p className="mt-0.5 truncate text-xs text-m3-on-surface-variant">by {version.published_by_name}</p>}</button>; })}</div>
          {!readOnly && data.status === "published" && !(versions.data ?? []).some((version) => version.status === "draft") && <Button variant="outline" className="w-full gap-2" onClick={() => void confirmedAction("Create a new program version?", "The latest published paths and settings will be copied into an editable draft.", "Create version", () => update.mutateAsync({}), "Draft version created")}><GitBranch className="h-4 w-4" /> New version</Button>}
        </aside>
      </div>

      {pathPickerOpen && <EntityMultiSelectDialog title="Add Career Paths" searchPlaceholder="Search by name or slug" items={pathCandidates} alreadySelectedIds={new Set(data.paths.map((path) => path.career_path_id))} isLoading={options.isLoading} query={pathQuery} onQueryChange={setPathQuery} onConfirm={(rows) => { void update.mutateAsync({ career_path_ids: composePathIds(rows.map((row) => row.id)) }).then(() => toast.success("Career Paths added")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not add paths")); setPathPickerOpen(false); }} onClose={() => setPathPickerOpen(false)} emptyText="No published Career Path found" alreadyAddedLabel="Added" />}
      {importOpen && <ImportStudentsDialog programId={id} onClose={() => setImportOpen(false)} />}
      {studentPickerOpen && <EntityMultiSelectDialog title="Enroll students" searchPlaceholder="Search students by name or email" items={studentCandidates} alreadySelectedIds={new Set((roster.data ?? []).map((row) => row.student_id))} isLoading={users.isLoading} query={studentQuery} onQueryChange={setStudentQuery} onConfirm={(rows) => { void enroll.mutateAsync(rows.map((row) => row.id)).then(() => toast.success("Students enrolled")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not enroll students")); setStudentPickerOpen(false); }} onClose={() => setStudentPickerOpen(false)} emptyText="No student found" alreadyAddedLabel="Enrolled" />}
    </div>
  );
}

function ProgramGeneral({ data, readOnly, onSave }: { data: NonNullable<ReturnType<typeof useManagedLearningProgram>["data"]>; readOnly: boolean; onSave: (payload: { name?: string; slug?: string; description?: string | null }) => Promise<unknown> }) {
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug);
  const [description, setDescription] = useState(data.description ?? "");
  return <section className="space-y-4 rounded-xl bg-card p-5 ghost-border"><h2 className="font-headline text-lg font-bold">General</h2><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Program name <span className="text-red-600">*</span><Input disabled={readOnly} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Slug <span className="text-red-600">*</span><Input disabled={readOnly} className="font-mono" value={slug} onChange={(event) => setSlug(event.target.value)} /></label></div><label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description<Textarea disabled={readOnly} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>{!readOnly && <div className="flex justify-end"><Button disabled={!name.trim() || !slug.trim()} onClick={() => void onSave({ name: name.trim(), slug: slug.trim(), description: description.trim() || null }).then(() => toast.success("Program details saved")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save"))}>Save changes</Button></div>}</section>;
}
