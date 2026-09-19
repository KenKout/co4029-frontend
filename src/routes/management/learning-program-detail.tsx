import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Archive, ArrowLeft, GitBranch, History, Plus, Route, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { PathChangeHistoryTab } from "./_components/learning-program-detail/PathChangeHistoryTab";
import { ImportStudentsDialog } from "./_components/learning-program-detail/ImportStudentsDialog";
import { careerPathLimitToInput, parseCareerPathLimit } from "./_components/career-path-limit";

type TabKey = "general" | "roster" | "requests" | "history";

/**
 * Three concerns that used to be stacked on one scroll: authoring the
 * program, staffing it, and reviewing switch requests. Different people do
 * them at different times, so they get tabs rather than one long column.
 *
 * The count badges make the tabs self-announcing — a dean lands here and
 * sees "Path changes 3" without opening anything.
 */
const TABS = (t: (key: string) => string, pending: number, history: number, enrolled: number): TabDef<TabKey>[] => [
  { key: "general", label: t("management_learning_program_detail.tabs.general"), icon: Route },
  { key: "roster", label: t("management_learning_program_detail.tabs.roster"), icon: Users, count: enrolled || undefined },
  { key: "requests", label: t("management_learning_program_detail.tabs.requests"), icon: GitBranch, count: pending || undefined },
  { key: "history", label: t("management_learning_program_detail.tabs.history"), icon: History, count: history || undefined },
];

function getPublishBlockedReason(t: (key: string) => string, hasDefault: boolean, limitFits: boolean): string | undefined {
  if (!hasDefault) return t("management_learning_program_detail.paths.default_required");
  if (!limitFits) return t("management_learning_program_detail.paths.limit_exceeds_paths");
  return undefined;
}

export default function ManagementLearningProgramDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id: string };
  // Tab rides the URL (?tab=requests) so a dean notification can deep-link
  // straight to the Path changes review queue of THIS program. Unknown or
  // absent values fall back to "general" (validateSearch drops them).
  const { tab: tabParam } = useSearch({ strict: false }) as {
    tab?: "general" | "roster" | "requests" | "history";
  };
  const tab: TabKey =
    tabParam === "roster" || tabParam === "requests" || tabParam === "history"
      ? tabParam
      : "general";
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
  if (!data) return <p>{t("management_learning_program_detail.not_found")}</p>;

  const composePathIds = (extraIds: string[]) => [
    ...data.paths.map((path) => path.career_path_id),
    ...extraIds,
  ];

  async function confirmedAction(title: string, description: string, label: string, action: () => Promise<unknown>, success: string) {
    if (!(await confirm({ title, description, confirmLabel: label, cancelLabel: t("management_learning_program_detail.actions.cancel"), confirmVariant: label === t("management_learning_program_detail.actions.archive") ? "destructive" : "default" }))) return;
    try { await action(); toast.success(success); setSelectedVersionId(null); }
    catch (error) { toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.action_failed"))); }
  }

  const isDraft = data.current_version.status === "draft" && !readOnly;
  // OPEN requests, not just `pending`: an acknowledged (`in_progress`) request
  // is still the dean's to decide, so it stays in the queue and in the badge.
  const openRequests = (requests.data ?? []).filter(
    (request) => request.status === "pending" || request.status === "in_progress",
  );
  const pendingCount = openRequests.length;
  const historyRequests = (requests.data ?? []).filter(
    (request) => request.status !== "pending" && request.status !== "in_progress",
  );
  const currentPaths = data.paths;
  const hasDefaultPath = currentPaths.some((path) => path.is_default);
  // A program that sets no cap of its own can never promise more paths than
  // it attaches, so publish is not blocked on this. Left as a bare
  // comparison, `null <= n` coerces to `0 <= n` and happens to be true --
  // right answer, wrong reason, and it flips the moment the operator changes.
  const programLimit = data.current_version.max_career_paths_per_enrollment;
  const pathLimitFits = programLimit === null || programLimit <= currentPaths.length;
  const publishBlockedReason = getPublishBlockedReason(t, hasDefaultPath, pathLimitFits);

  async function removePath(pathId: string, pathName: string) {
    const accepted = await confirm({
      title: t("management_learning_program_detail.confirm.remove_path_title", { name: pathName }),
      description: t("management_learning_program_detail.confirm.remove_path_description"),
      confirmLabel: t("management_learning_program_detail.confirm.remove_path"),
      cancelLabel: t("management_learning_program_detail.actions.cancel"),
      confirmVariant: "destructive",
    });
    if (!accepted) return;

    try {
      await update.mutateAsync({
        career_path_ids: currentPaths
          .filter((path) => path.career_path_id !== pathId)
          .map((path) => path.career_path_id),
      });
      toast.success(t("management_learning_program_detail.toast.path_removed"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.path_remove_failed")));
    }
  }

  async function setDefaultPath(pathId: string) {
    try {
      await update.mutateAsync({ default_career_path_id: pathId });
      toast.success(t("management_learning_program_detail.toast.default_path_saved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.default_path_failed")));
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {dialog}
      <Link to="/management/learning-programs" className="inline-flex items-center gap-2 text-sm font-semibold text-m3-primary"><ArrowLeft className="h-4 w-4" /> {t("management_learning_program_detail.back")}</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="font-headline text-3xl font-black">{data.name}</h1><span className="rounded-full bg-m3-surface-container px-3 py-1 text-xs font-semibold">{t(`management_learning_program_detail.status.${data.status}`)}</span></div><p className="mt-1 font-mono text-xs text-m3-on-surface-variant">{data.slug}</p></div>
        {!readOnly && <div className="flex gap-2">{isDraft && <Button disabled={Boolean(publishBlockedReason)} title={publishBlockedReason} onClick={() => void confirmedAction(t("management_learning_program_detail.confirm.publish_title"), t("management_learning_program_detail.confirm.publish_description"), t("management_learning_program_detail.actions.publish"), () => publish.mutateAsync(), t("management_learning_program_detail.toast.published"))}>{t("management_learning_program_detail.actions.publish")}</Button>}{data.status !== "archived" && <Button variant="outline" className="gap-2" onClick={() => void confirmedAction(t("management_learning_program_detail.confirm.archive_title"), t("management_learning_program_detail.confirm.archive_description"), t("management_learning_program_detail.actions.archive"), () => archive.mutateAsync(), t("management_learning_program_detail.toast.archived"))}><Archive className="h-4 w-4" /> {t("management_learning_program_detail.actions.archive")}</Button>}</div>}
      </header>
      {readOnly && <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("management_learning_program_detail.readonly_version", { version: data.current_version.version_no })}</div>}

      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-6 lg:col-span-7">
          <Tabs<TabKey>
            tabs={TABS(t, pendingCount, historyRequests.length, (roster.data ?? []).length)}
            value={tab}
            onChange={setTab}
            ariaLabel={t("management_learning_program_detail.tabs.aria")}
          />

          {tab === "general" && (
            <>
              <ProgramGeneral key={data.current_version.id} data={data} maxCareerPathsCeiling={options.data?.max_career_paths_per_program ?? 10} readOnly={readOnly || !isDraft} onSave={(payload) => update.mutateAsync(payload)} />
              <section className="space-y-4 rounded-xl bg-card p-5 ghost-border">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline text-lg font-bold">{t("management_learning_program_detail.paths.title")}</h2><p className="text-sm text-m3-on-surface-variant">{t("management_learning_program_detail.paths.description", { version: data.current_version.version_no })}</p></div>{isDraft && (
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
                      <Plus className="h-4 w-4" /> {t("management_learning_program_detail.actions.create_path")}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setPathPickerOpen(true)}>
                      <Plus className="h-4 w-4" /> {t("management_learning_program_detail.actions.add_path")}
                    </Button>
                  </div>
                )}</div>
                {isDraft && data.paths.length > 0 && !hasDefaultPath && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {t("management_learning_program_detail.paths.default_required")}
                  </p>
                )}
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
                          {path.is_default && <Badge className="mt-1"><Star className="h-3 w-3" /> {t("management_learning_program_detail.paths.default_badge")}</Badge>}
                          <p className="mt-1 text-xs text-m3-on-surface-variant">
                            {t("management_learning_program_detail.paths.version_status", {
                              version: path.career_path_version_no,
                              status: t(`management_learning_program_detail.status.${path.status}`),
                            })}
                          </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-m3-primary" />
                      </Link>
                      {isDraft && (
                        !path.is_default ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() => void setDefaultPath(path.career_path_id)}
                          >
                            <Star className="h-4 w-4" /> {t("management_learning_program_detail.paths.set_default")}
                          </Button>
                        ) : null
                      )}
                      {isDraft && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("management_learning_program_detail.paths.remove_aria", { name: path.name })}
                          disabled={update.isPending || path.is_default}
                          title={path.is_default ? t("management_learning_program_detail.paths.default_remove_hint") : undefined}
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
            />
          )}

          {tab === "history" && (
            <PathChangeHistoryTab
              requests={historyRequests}
              roster={roster.data ?? []}
            />
          )}
        </main>

        <aside className="space-y-4 rounded-xl border border-m3-outline-variant/40 bg-card p-4 lg:col-span-3 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><div><h2 className="font-headline font-bold">{t("management_learning_program_detail.versions.title")}</h2><p className="text-xs text-m3-on-surface-variant">{t("management_learning_program_detail.versions.description")}</p></div><GitBranch className="h-5 w-5 text-m3-primary" /></div>
          <div className="space-y-2">{(versions.data ?? []).map((version) => { const editing = version.status === "draft" && !selectedVersionId; const selected = selectedVersionId === version.id || editing; return <Button key={version.id} type="button" variant="ghost" onClick={() => setSelectedVersionId(version.status === "draft" ? null : version.id)} className={`block h-auto w-full whitespace-normal rounded-lg border p-3 text-left ${selected ? "border-m3-primary bg-m3-primary-fixed/50 hover:bg-m3-primary-fixed/50" : "border-m3-outline-variant/40 hover:bg-m3-surface-container"}`}><div className="flex justify-between"><span className="font-semibold">v{version.version_no}</span><span className="text-[11px] uppercase text-m3-on-surface-variant">{t(`management_learning_program_detail.status.${version.status}`)}</span></div><p className="mt-1 text-xs text-m3-on-surface-variant">{version.published_at ? formatDate(version.published_at) : t("management_learning_program_detail.versions.not_published")}</p>{version.published_by_name && <p className="mt-0.5 truncate text-xs text-m3-on-surface-variant">{t("management_learning_program_detail.versions.published_by", { name: version.published_by_name })}</p>}</Button>; })}</div>
          {!readOnly && data.status === "published" && !(versions.data ?? []).some((version) => version.status === "draft") && <Button variant="outline" className="w-full gap-2" onClick={() => void confirmedAction(t("management_learning_program_detail.confirm.new_version_title"), t("management_learning_program_detail.confirm.new_version_description"), t("management_learning_program_detail.actions.create_version"), () => update.mutateAsync({}), t("management_learning_program_detail.toast.version_created"))}><GitBranch className="h-4 w-4" /> {t("management_learning_program_detail.actions.create_version")}</Button>}
        </aside>
      </div>

      {pathPickerOpen && <EntityMultiSelectDialog title={t("management_learning_program_detail.paths.picker_title")} searchPlaceholder={t("management_learning_program_detail.paths.picker_search")} items={pathCandidates} alreadySelectedIds={new Set(data.paths.map((path) => path.career_path_id))} isLoading={options.isLoading} query={pathQuery} onQueryChange={setPathQuery} onConfirm={(rows) => { const addedPathIds = rows.map((row) => row.id); const defaultPathId = data.paths.find((path) => path.is_default)?.career_path_id ?? data.paths[0]?.career_path_id ?? addedPathIds[0] ?? null; void update.mutateAsync({ career_path_ids: composePathIds(addedPathIds), default_career_path_id: defaultPathId }).then(() => toast.success(t("management_learning_program_detail.toast.paths_added"))).catch((error: unknown) => toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.paths_add_failed")))); setPathPickerOpen(false); }} onClose={() => setPathPickerOpen(false)} emptyText={t("management_learning_program_detail.paths.picker_empty")} alreadyAddedLabel={t("management_learning_program_detail.paths.picker_added")} />}
      {importOpen && <ImportStudentsDialog programId={id} onClose={() => setImportOpen(false)} />}
      {studentPickerOpen && <EntityMultiSelectDialog title={t("management_learning_program_detail.student_picker.title")} searchPlaceholder={t("management_learning_program_detail.student_picker.search")} items={studentCandidates} alreadySelectedIds={new Set((roster.data ?? []).map((row) => row.student_id))} isLoading={users.isLoading} query={studentQuery} onQueryChange={setStudentQuery} onConfirm={(rows) => { void enroll.mutateAsync(rows.map((row) => row.id)).then(() => toast.success(t("management_learning_program_detail.toast.students_enrolled"))).catch((error: unknown) => toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.students_enroll_failed")))); setStudentPickerOpen(false); }} onClose={() => setStudentPickerOpen(false)} emptyText={t("management_learning_program_detail.student_picker.empty")} alreadyAddedLabel={t("management_learning_program_detail.student_picker.added")} />}
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
function ProgramGeneral({ data, maxCareerPathsCeiling, readOnly, onSave }: { data: NonNullable<ReturnType<typeof useManagedLearningProgram>["data"]>; maxCareerPathsCeiling: number; readOnly: boolean; onSave: (payload: { name?: string; slug?: string; description?: string | null; max_path_switches?: number; max_career_paths_per_enrollment?: number | null }) => Promise<unknown> }) {
  const { t } = useTranslation();
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug);
  const [description, setDescription] = useState(data.description ?? "");
  const [maxPathSwitches, setMaxPathSwitches] = useState(
    String(data.current_version.max_path_switches),
  );
  const [maxCareerPaths, setMaxCareerPaths] = useState(careerPathLimitToInput(data.current_version.max_career_paths_per_enrollment));

  const switches = Number.parseInt(maxPathSwitches, 10);
  const switchesValid =
    Number.isInteger(switches) && switches >= 0 && switches <= 100;
  const careerPathLimit = parseCareerPathLimit(maxCareerPaths, maxCareerPathsCeiling);

  return <section className="space-y-4 rounded-xl bg-card p-5 ghost-border"><h2 className="font-headline text-lg font-bold">{t("management_learning_program_detail.general.title")}</h2><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">{t("management_learning_program_detail.general.name")} <span className="text-red-600">*</span><Input disabled={readOnly} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">{t("management_learning_program_detail.general.slug")} <span className="text-red-600">*</span><Input mono disabled={readOnly} value={slug} onChange={(event) => setSlug(event.target.value)} /></label></div>
    <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
      {t("management_learning_program_detail.general.switches")}
      <Input
        type="number"
        min={0}
        max={100}
        disabled={readOnly}
        value={maxPathSwitches}
        onChange={(event) => setMaxPathSwitches(event.target.value)}
      />
      <span className="block text-[11px] font-normal normal-case tracking-normal text-m3-on-surface-variant">
        {t("management_learning_program_detail.general.switches_hint", {
          version: data.current_version.version_no,
        })}
      </span>
      {!readOnly && !switchesValid && (
        <span className="block text-[11px] font-normal normal-case tracking-normal text-red-600">
          {t("management_learning_program_detail.general.switches_error")}
        </span>
      )}
    </label>
    <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
      {t("management_learning_program_detail.general.career_path_limit")}
      <Input type="number" min={1} max={maxCareerPathsCeiling} disabled={readOnly} value={maxCareerPaths} onChange={(event) => setMaxCareerPaths(event.target.value)} />
      <span className="block text-[11px] font-normal normal-case tracking-normal text-m3-on-surface-variant">{t("management_learning_program_detail.general.career_path_limit_hint", { ceiling: maxCareerPathsCeiling, version: data.current_version.version_no })}</span>
      {!readOnly && !careerPathLimit.ok && <span className="block text-[11px] font-normal normal-case tracking-normal text-red-600">{t("management_learning_program_detail.general.career_path_limit_error", { ceiling: maxCareerPathsCeiling })}</span>}
    </label>
    <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">{t("management_learning_program_detail.general.description")}<Textarea disabled={readOnly} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>{!readOnly && <div className="flex justify-end"><Button disabled={!name.trim() || !slug.trim() || !switchesValid || !careerPathLimit.ok} onClick={() => void onSave({ name: name.trim(), slug: slug.trim(), description: description.trim() || null, max_path_switches: switches, max_career_paths_per_enrollment: careerPathLimit.ok ? careerPathLimit.value : undefined }).then(() => toast.success(t("management_learning_program_detail.toast.details_saved"))).catch((error: unknown) => toast.error(getApiErrorMessage(error, t("management_learning_program_detail.toast.save_failed"))))}>{t("management_learning_program_detail.actions.save")}</Button></div>}</section>;
}
