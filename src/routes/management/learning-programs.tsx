import { useNavigate } from "@tanstack/react-router";
import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";
import { usePermissions } from "@/lib/auth/use-permissions";

export default function ManagementLearningProgramsPage() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canRead = permissions.hasAny("learning_program.read", "learning_program.manage");
  const canManage = permissions.has("learning_program.manage");
  const programs = useManagedLearningPrograms();

  if (permissions.isLoading || programs.isLoading) return <PageSkeleton rows={4} />;
  if (!canRead) return <PermissionDenied />;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Learning Programs"
        subtitle="Enroll students into versioned programs; students choose their own Career Path."
        action={canManage ? <Button className="gap-2" onClick={() => void navigate({ to: "/management/learning-programs/new" })}><Plus className="h-4 w-4" /> New program</Button> : undefined}
      />
      {programs.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.data.map((program) => (
            <button
              key={program.id}
              type="button"
              onClick={() => void navigate({ to: "/management/learning-programs/$id", params: { id: program.id } })}
              className="cursor-pointer rounded-2xl bg-card p-5 text-left ghost-border transition-shadow hover:shadow-editorial"
            >
              <div className="flex items-center justify-between gap-3"><GraduationCap className="h-6 w-6 text-m3-primary" /><span className="rounded-full bg-m3-surface-container px-2 py-1 text-xs font-semibold">{program.status}</span></div>
              <h2 className="mt-4 font-headline text-lg font-bold">{program.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-m3-on-surface-variant">{program.description || program.slug}</p>
              <p className="mt-4 text-xs font-semibold text-m3-primary">v{program.current_version.version_no} · {program.paths.length} paths</p>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No Learning Programs" description="Create a draft and add published Career Paths before publishing it." />
      )}
    </div>
  );
}
