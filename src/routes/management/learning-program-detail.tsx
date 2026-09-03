import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Archive, ArrowLeft, GitBranch, Plus, Route, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EntityMultiSelectDialog, type SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/use-confirm";
import { useAdminUsersSearch } from "@/lib/api/hooks/admin-organizations";
import { getApiErrorMessage } from "@/lib/api/error-codes";
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
import { PathChangeRequestsTab } from "./_components/learning-program-detail/PathChangeRequestsTab";
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
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id: string };
  // Tab rides the URL (?tab=requests) so a dean notification can deep-link
  // straight to the Path changes review queue of THIS program. Unknown or
  // absent values fall back to "general" (validateSearch drops them).
  const { tab: tabParam } = useSearch({ strict: false }) as {
    tab?: "general" | "roster" | "requests";
  };
  const tab: TabKey =
    tabParam === "roster" || tabParam === "requests" ? tabParam : "general";
  const setTab = (next: TabKey) =>
    void navigate({
      to: "/management/learning-programs/$id",
      params: { id },
      search: { tab: next },
    });
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
    catch (error) { toast.error(getApiErrorMessage(error, "Action failed")); }
  }

  const isDraft = data.current_version.status === "draft" && !readOnly;
  // OPEN requests, not just `pending`: an acknowledged (`in_progress`) request
  // is still the dean's to decide, so it stays in the queue and in the badge.
  const openRequests = (requests.data ?? []).filter(
    (request) => request.status === "pending" || request.status === "in_progress",
  );
  const pendingCount = openRequests.length;
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
      toast.error(getApiErrorMessage(error, "Could not remove the Career Path"));
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
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline text-lg font-bold">Career Paths</h2><p className="text-sm text-m3-on-surface-variant">Published path versions pinned in program v{data.current_version.version_no}.</p></div>{isDraft && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Only PUBLISHED paths can be pinned into a program, so a
                        dean with nothing to add has no way forward from here
                        — the picker would just be empty. This is the way out:
                        author the path first, then come back and add it. */}
                    <Button
                      variant="ghost"
                      className="gap-2"
                      onClick={() =>
                        void navigate({
                          to: "/management/career-paths/$id",
                          params: { id: "new" },
                        })
                      }
                    >
                      <Plus className="h-4 w-4" /> Create new path
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setPathPickerOpen(true)}>
                      <Plus className="h-4 w-4" /> Add Career Path
                    </Button>
                  </div>
                )}</div>
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
            <PathChangeRequestsTab
              programId={id}
              requests={openRequests}
              roster={roster.data ?? []}
              onApprove={(request) =>
                void confirmedAction(
                  "Approve path change?",
                  "The current path is snapshotted and the student moves to the target path.",
                  "Approve",
                  () => decide.mutateAsync({ requestId: request.id, approve: true }),
                  "Path change approved",
                )
              }
            />
          )}
        </main>

        <aside className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-4 lg:col-span-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><div><h2 className="font-headline font-bold">Versions</h2><p className="text-xs text-m3-on-surface-variant">Published history is read-only.</p></div><GitBranch className="h-5 w-5 text-m3-primary" /></div>
          <div className="space-y-2">{(versions.data ?? []).map((version) => { const editing = version.status === "draft" && !selectedVersionId; const selected = selectedVersionId === version.id || editing; return <button key={version.id} type="button" onClick={() => setSelectedVersionId(version.status === "draft" ? null : version.id)} className={`w-full cursor-pointer rounded-lg border p-3 text-left ${selected ? "border-m3-primary bg-m3-primary-fixed/50" : "border-m3-outline-variant/40 hover:bg-m3-surface-container"}`}><div className="flex justify-between"><span className="font-semibold">v{version.version_no}</span><span className="text-[11px] uppercase text-m3-on-surface-variant">{version.status}</span></div><p className="mt-1 text-xs text-m3-on-surface-variant">{version.published_at ? formatDate(version.published_at) : "Not published"}</p>{version.published_by_name && <p className="mt-0.5 truncate text-xs text-m3-on-surface-variant">by {version.published_by_name}</p>}</button>; })}</div>
          {!readOnly && data.status === "published" && !(versions.data ?? []).some((version) => version.status === "draft") && <Button variant="outline" className="w-full gap-2" onClick={() => void confirmedAction("Create a new program version?", "The latest published paths and settings will be copied into an editable draft.", "Create version", () => update.mutateAsync({}), "Draft version created")}><GitBranch className="h-4 w-4" /> New version</Button>}
        </aside>
      </div>

      {pathPickerOpen && <EntityMultiSelectDialog title="Add Career Paths" searchPlaceholder="Search by name or slug" items={pathCandidates} alreadySelectedIds={new Set(data.paths.map((path) => path.career_path_id))} isLoading={options.isLoading} query={pathQuery} onQueryChange={setPathQuery} onConfirm={(rows) => { void update.mutateAsync({ career_path_ids: composePathIds(rows.map((row) => row.id)) }).then(() => toast.success("Career Paths added")).catch((error: unknown) => toast.error(getApiErrorMessage(error, "Could not add paths"))); setPathPickerOpen(false); }} onClose={() => setPathPickerOpen(false)} emptyText="No published Career Path found" alreadyAddedLabel="Added" />}
      {importOpen && <ImportStudentsDialog programId={id} onClose={() => setImportOpen(false)} />}
      {studentPickerOpen && <EntityMultiSelectDialog title="Enroll students" searchPlaceholder="Search students by name or email" items={studentCandidates} alreadySelectedIds={new Set((roster.data ?? []).map((row) => row.student_id))} isLoading={users.isLoading} query={studentQuery} onQueryChange={setStudentQuery} onConfirm={(rows) => { void enroll.mutateAsync(rows.map((row) => row.id)).then(() => toast.success("Students enrolled")).catch((error: unknown) => toast.error(getApiErrorMessage(error, "Could not enroll students"))); setStudentPickerOpen(false); }} onClose={() => setStudentPickerOpen(false)} emptyText="No student found" alreadyAddedLabel="Enrolled" />}
    </div>
  );
}

/**
 * Program identity + the path-switch budget for the version being edited.
 *
 * `max_path_switches` lives on the VERSION, not the program, so editing it here
 * only ever affects the draft on screen: students already enrolled stay on the
 * budget their pinned version carried when they enrolled. That is the point of
 * versioning it, and the hint says so rather than leaving a manager to guess
 * whether a change is retroactive (it is not).
 */
function ProgramGeneral({ data, readOnly, onSave }: { data: NonNullable<ReturnType<typeof useManagedLearningProgram>["data"]>; readOnly: boolean; onSave: (payload: { name?: string; slug?: string; description?: string | null; max_path_switches?: number }) => Promise<unknown> }) {
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug);
  const [description, setDescription] = useState(data.description ?? "");
  const [maxPathSwitches, setMaxPathSwitches] = useState(
    String(data.current_version.max_path_switches),
  );

  const switches = Number.parseInt(maxPathSwitches, 10);
  const switchesValid =
    Number.isInteger(switches) && switches >= 0 && switches <= 100;

  return <section className="space-y-4 rounded-xl bg-card p-5 ghost-border"><h2 className="font-headline text-lg font-bold">General</h2><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Program name <span className="text-red-600">*</span><Input disabled={readOnly} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Slug <span className="text-red-600">*</span><Input disabled={readOnly} className="font-mono" value={slug} onChange={(event) => setSlug(event.target.value)} /></label></div>
    <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
      Path changes allowed
      <Input
        type="number"
        min={0}
        max={100}
        disabled={readOnly}
        value={maxPathSwitches}
        onChange={(event) => setMaxPathSwitches(event.target.value)}
      />
      <span className="block text-[11px] font-normal normal-case tracking-normal text-m3-on-surface-variant">
        How many Career Path switches a student may request in this program, each
        needing Faculty Dean approval (0 locks the choice). Applies to program
        v{data.current_version.version_no}; students already enrolled keep the
        budget of the version they enrolled under.
      </span>
      {!readOnly && !switchesValid && (
        <span className="block text-[11px] font-normal normal-case tracking-normal text-red-600">
          Enter a whole number between 0 and 100.
        </span>
      )}
    </label>
    <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description<Textarea disabled={readOnly} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>{!readOnly && <div className="flex justify-end"><Button disabled={!name.trim() || !slug.trim() || !switchesValid} onClick={() => void onSave({ name: name.trim(), slug: slug.trim(), description: description.trim() || null, max_path_switches: switches }).then(() => toast.success("Program details saved")).catch((error: unknown) => toast.error(getApiErrorMessage(error, "Could not save")))}>Save changes</Button></div>}</section>;
}
