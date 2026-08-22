import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";

export function ProgramsTab({ pathId }: { pathId: string }) {
  const programs = useManagedLearningPrograms();
  if (programs.isLoading) return <PageSkeleton rows={2} />;
  const rows = (programs.data ?? []).filter((program) =>
    program.paths.some((path) => path.career_path_id === pathId),
  );

  if (!rows.length) {
    return (
      <EmptyState
        icon={Boxes}
        title="No Learning Program"
        description="This Career Path is not included in a Learning Program version yet."
      />
    );
  }

  return (
    <div className="divide-y divide-m3-outline-variant rounded-xl border border-m3-outline-variant/40 bg-card">
      {rows.map((program) => (
        <Link
          key={program.id}
          to="/management/learning-programs/$id"
          params={{ id: program.id }}
          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-m3-surface-container"
        >
          <div className="min-w-0">
            <p className="font-semibold text-m3-on-surface">{program.name}</p>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              v{program.current_version.version_no} · {program.status}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-m3-primary" />
        </Link>
      ))}
    </div>
  );
}
