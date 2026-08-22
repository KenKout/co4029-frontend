import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GraduationCap, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateLearningProgram,
  useManagedLearningPrograms,
} from "@/lib/api/hooks/learning-programs";
import { usePermissions } from "@/lib/auth/use-permissions";

export default function ManagementLearningProgramsPage() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canRead = permissions.hasAny("learning_program.read", "learning_program.manage");
  const canManage = permissions.has("learning_program.manage");
  const programs = useManagedLearningPrograms();
  const create = useCreateLearningProgram();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    organizationId: "",
    facultyId: "",
    deanId: "",
    slug: "",
    name: "",
    description: "",
    pathIds: "",
  });
  const rows = useMemo(() => programs.data ?? [], [programs.data]);

  if (permissions.isLoading || programs.isLoading) return <PageSkeleton rows={4} />;
  if (!canRead) return <PermissionDenied />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const program = await create.mutateAsync({
        organization_id: form.organizationId.trim(),
        faculty_id: form.facultyId.trim(),
        owner_faculty_dean_id: form.deanId.trim(),
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        career_path_ids: form.pathIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      });
      toast.success("Learning Program created");
      setOpen(false);
      void navigate({ to: "/management/learning-programs/$id", params: { id: program.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the program");
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Learning Programs"
        subtitle="Enroll students into versioned programs; students choose their own career path."
        action={
          canManage ? (
            <Button onClick={() => setOpen((value) => !value)} className="gap-2">
              <Plus className="h-4 w-4" /> New program
            </Button>
          ) : undefined
        }
      />

      {open && (
        <form onSubmit={(event) => void submit(event)} className="grid gap-3 rounded-2xl bg-card ghost-border p-5 md:grid-cols-2">
          <Input required placeholder="Organization UUID" value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })} />
          <Input required placeholder="Faculty UUID" value={form.facultyId} onChange={(event) => setForm({ ...form, facultyId: event.target.value })} />
          <Input required placeholder="Owner Faculty Dean UUID" value={form.deanId} onChange={(event) => setForm({ ...form, deanId: event.target.value })} />
          <Input required placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          <Input required placeholder="Program name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Published Career Path UUIDs, comma-separated" value={form.pathIds} onChange={(event) => setForm({ ...form, pathIds: event.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create draft</Button>
          </div>
        </form>
      )}

      {rows.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((program) => (
            <button
              key={program.id}
              type="button"
              onClick={() => void navigate({ to: "/management/learning-programs/$id", params: { id: program.id } })}
              className="rounded-2xl bg-card ghost-border p-5 text-left hover:shadow-editorial transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <GraduationCap className="h-6 w-6 text-m3-primary" />
                <span className="rounded-full bg-m3-surface-container px-2 py-1 text-xs font-semibold">{program.status}</span>
              </div>
              <h2 className="mt-4 font-headline font-bold text-lg">{program.name}</h2>
              <p className="mt-1 text-sm text-m3-on-surface-variant line-clamp-2">{program.description || program.slug}</p>
              <p className="mt-4 text-xs font-semibold text-m3-primary">Version {program.current_version.version_no} · {program.paths.length} paths</p>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No Learning Programs" description="Create a draft and add published Career Paths before publishing it." />
      )}
    </div>
  );
}
