import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EntityMultiSelectDialog, type SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/use-confirm";
import { useCreateLearningProgram, useLearningProgramOptions } from "@/lib/api/hooks/learning-programs";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ManagementLearningProgramNewPage() {
  const navigate = useNavigate();
  const options = useLearningProgramOptions();
  const create = useCreateLearningProgram();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!facultyId && options.data?.default_faculty_id) setFacultyId(options.data.default_faculty_id);
  }, [facultyId, options.data?.default_faculty_id]);

  const candidates: SelectableEntity[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (options.data?.career_paths ?? [])
      .filter((path) => !needle || path.name.toLowerCase().includes(needle) || path.slug?.toLowerCase().includes(needle))
      .map((path) => ({ id: path.id, primaryLabel: path.name, secondaryLabel: path.slug, selectable: path.selectable, notSelectableReason: path.not_selectable_reason }));
  }, [options.data?.career_paths, query]);
  const selectedPaths = (options.data?.career_paths ?? []).filter((path) => selectedPathIds.includes(path.id));

  if (options.isLoading) return <PageSkeleton rows={4} />;

  async function submit() {
    if (!name.trim() || !slug.trim() || !facultyId) {
      toast.error("Program name, slug and faculty are required");
      return;
    }
    const accepted = await confirm({
      title: "Create Learning Program draft?",
      description: "The selected Career Paths will be pinned to draft v1.",
      confirmLabel: "Create draft",
      cancelLabel: "Cancel",
      confirmVariant: "default",
    });
    if (!accepted) return;
    try {
      const program = await create.mutateAsync({
        faculty_id: facultyId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        career_path_ids: selectedPathIds,
      });
      toast.success("Learning Program draft created");
      void navigate({ to: "/management/learning-programs/$id", params: { id: program.id }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the program");
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {dialog}
      <PageHeader title="New Learning Program" subtitle="Create the program identity and choose published Career Paths by name." action={<Button onClick={() => void submit()} disabled={create.isPending}>Create draft</Button>} />
      <div className="grid gap-6 lg:grid-cols-10">
        <main className="space-y-5 rounded-xl border border-m3-outline-variant/40 bg-card p-5 lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Program name <span className="text-red-600">*</span><Input autoFocus value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!slugTouched) setSlug(slugify(value)); }} /></label>
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Slug <span className="text-red-600">*</span><Input className="font-mono" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} /></label>
          </div>
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Faculty <span className="text-red-600">*</span><Select value={facultyId} onValueChange={setFacultyId} placeholder="Select faculty" options={(options.data?.faculties ?? []).map((faculty) => ({ value: faculty.id, label: faculty.name }))} /></label>
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">Description<Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <section className="space-y-3 border-t border-m3-outline-variant/30 pt-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-headline font-bold">Career Paths</h2><p className="text-xs text-m3-on-surface-variant">Choose by name; exact published versions are pinned on creation.</p></div><Button type="button" variant="outline" className="gap-2" onClick={() => setPickerOpen(true)}><Plus className="h-4 w-4" /> Add paths</Button></div>
            <div className="space-y-2">{selectedPaths.map((path) => <div key={path.id} className="flex items-center justify-between rounded-lg bg-m3-surface-container p-3"><div><p className="text-sm font-semibold">{path.name}</p><p className="font-mono text-xs text-m3-on-surface-variant">{path.slug}</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${path.name}`} onClick={() => setSelectedPathIds((ids) => ids.filter((id) => id !== path.id))}><X className="h-4 w-4" /></Button></div>)}</div>
          </section>
        </main>
        <aside className="rounded-xl border border-dashed border-m3-outline-variant p-5 text-sm text-m3-on-surface-variant lg:col-span-3">Version history and publishing controls become available after draft creation.</aside>
      </div>
      {pickerOpen && <EntityMultiSelectDialog title="Add Career Paths" searchPlaceholder="Search by name or slug" items={candidates} alreadySelectedIds={new Set(selectedPathIds)} isLoading={false} query={query} onQueryChange={setQuery} onConfirm={(rows) => { setSelectedPathIds((ids) => [...new Set([...ids, ...rows.map((row) => row.id)])]); setPickerOpen(false); setQuery(""); }} onClose={() => { setPickerOpen(false); setQuery(""); }} emptyText="No published Career Path found" alreadyAddedLabel="Added" />}
    </div>
  );
}
