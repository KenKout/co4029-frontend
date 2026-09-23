import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Boxes } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";

export function ProgramsTab({ pathId }: { pathId: string }) {
  const { t } = useTranslation();
  const programs = useManagedLearningPrograms();
  if (programs.isLoading) return <PageSkeleton rows={2} />;
  const rows = (programs.data ?? []).filter((program) =>
    program.paths.some((path) => path.career_path_id === pathId),
  );

  if (!rows.length) {
    return (
      <EmptyState
        icon={Boxes}
        title={t("management_career_path_detail.programs.empty_title")}
        description={t(
          "management_career_path_detail.programs.empty_description",
        )}
      />
    );
  }

  return (
    <div className="divide-y divide-m3-outline-variant rounded-xl border border-m3-outline-variant/40 bg-card">
      {rows.map((program) => {
        const path = program.paths.find(
          (candidate) => candidate.career_path_id === pathId,
        );
        return (
          <Link
            key={program.id}
            to="/management/learning-programs/$id"
            params={{ id: program.id }}
            search={{ version: program.current_version.id }}
            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-m3-surface-container"
          >
            <div className="min-w-0">
              <p className="font-semibold text-m3-on-surface">{program.name}</p>
              <p className="mt-1 text-xs text-m3-on-surface-variant">
                {t("management_career_path_detail.programs.version_status", {
                  version: program.current_version.version_no,
                  status: t(
                    `management_learning_program_detail.status.${program.status}`,
                  ),
                })}
              </p>
              {path && (
                <p className="mt-0.5 text-xs text-m3-on-surface-variant">
                  {t("management_career_path_detail.programs.path_version", {
                    version: path.career_path_version_no,
                  })}
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-m3-primary" />
          </Link>
        );
      })}
    </div>
  );
}
