import { useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  FileClock,
  GraduationCap,
  Layers,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/use-confirm";
import { useArchiveLearningProgram, useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";
import { useFormatDate } from "@/lib/format/date";
import { usePermissions } from "@/lib/auth/use-permissions";
import type { LearningProgram } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Status colours for a program: published green, draft amber, archived grey. */
const PROGRAM_STATUS_TOKENS = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function ManagementLearningProgramsPage() {
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canRead = permissions.hasAny("learning_program.read", "learning_program.manage");
  const canManage = permissions.has("learning_program.manage");
  // The pending path-change-request count is review work: only the dean
  // (learning_program.switch.review) sees it on the card (user decision
  // 2026-08-31). The count itself is not sensitive — the REVIEW SURFACE is.
  const isDean = permissions.has("learning_program.switch.review");
  const programs = useManagedLearningPrograms();

  if (permissions.isLoading || programs.isLoading) return <PageSkeleton rows={4} />;
  if (!canRead) return <PermissionDenied />;

  const active = (programs.data ?? []).filter((p) => p.status !== "archived");

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Learning Programs"
        subtitle="Enroll students into versioned programs; students choose their own Career Path."
        action={canManage ? <Button className="gap-2" onClick={() => void navigate({ to: "/management/learning-programs/new" })}><Plus className="h-4 w-4" /> New program</Button> : undefined}
      />
      {active.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((program) => (
            <ProgramCard key={program.id} program={program} canManage={canManage} isDean={isDean} />
          ))}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No Learning Programs" description="Create a draft and add published Career Paths before publishing it." />
      )}
    </div>
  );
}

/**
 * One program card: name, slug, current version, status, publication date,
 * student/path counts, a dean-only pending-change-request flag, a
 * draft-exists badge (deliberately the loudest element — a draft means live
 * revise work is in flight) and the archive (remove) control.
 *
 * The whole card navigates to the program detail; the remove icon stops
 * propagation and confirms first (archiving is not reversible through the
 * UI — the list hides archived programs).
 */
function ProgramCard({
  program,
  canManage,
  isDean,
}: {
  program: LearningProgram;
  canManage: boolean;
  isDean: boolean;
}) {
  const navigate = useNavigate();
  const formatDate = useFormatDate();
  const archive = useArchiveLearningProgram(program.id);
  const { confirm, dialog } = useConfirm({
    title: "Archive this program?",
    confirmLabel: "Archive program",
    cancelLabel: "Cancel",
  });

  const hasDraft = program.has_draft_version;
  const version = program.current_version;
  const pendingRequests = program.path_change_request_count ?? 0;

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !(await confirm({
        description: `"${program.name}" leaves the management list. Students already enrolled stay on their pinned version — this hides the program, it does not cancel anyone.`,
      }))
    ) {
      return;
    }
    archive.mutate(undefined, {
      onError: (error) => {
        void error;
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void navigate({ to: "/management/learning-programs/$id", params: { id: program.id } })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          void navigate({ to: "/management/learning-programs/$id", params: { id: program.id } });
        }
      }}
      className="group cursor-pointer rounded-2xl bg-card p-5 text-left ghost-border transition-shadow hover:shadow-editorial relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-m3-primary shrink-0" />
          <StatusBadge
            status={program.status}
            tokens={PROGRAM_STATUS_TOKENS}
            label={program.status}
            size="sm"
            shape="pill"
          />
          {hasDraft && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-300 animate-pulse">
              <FileClock className="h-3 w-3" />
              Draft v{version.version_no + 1}
            </span>
          )}
        </div>
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => void handleArchive(e)}
            disabled={archive.isPending}
            className="rounded-full p-1.5 h-auto w-auto text-text-muted opacity-60 transition-opacity hover:opacity-100 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            title="Archive program"
            aria-label={`Archive ${program.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <h2 className="mt-3 font-headline text-lg font-bold text-m3-on-surface truncate">
        {program.name}
      </h2>
      <p className="font-mono text-[11px] text-m3-on-surface-variant truncate">{program.slug}</p>
      {program.description && (
        <p className="mt-2 line-clamp-2 text-sm text-m3-on-surface-variant">{program.description}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-m3-on-surface-variant">
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <dt className="sr-only">Version</dt>
          <dd className="font-semibold text-m3-on-surface">v{version.version_no}</dd>
          {version.published_at && (
            <>
              <Calendar className="h-3.5 w-3.5 shrink-0 text-m3-on-surface-variant" />
              <dd className="truncate">{formatDate(version.published_at)}</dd>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 justify-end text-m3-on-surface-variant">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <dd className="font-semibold text-m3-on-surface">{program.student_count}</dd>
          <dd className="sr-only">students</dd>
        </div>
        <div className="flex items-center gap-1.5 text-m3-on-surface-variant">
          <dt className="sr-only">Paths</dt>
          <dd className="font-semibold text-m3-on-surface">{program.paths.length}</dd>
          <dd>paths</dd>
        </div>
        {isDean && (
          <div
            className={cn(
              "flex items-center gap-1.5 justify-end rounded-full px-2 py-0.5",
              pendingRequests > 0
                ? "bg-rose-100 text-rose-700"
                : "text-m3-on-surface-variant",
            )}
          >
            <dt className="sr-only">Path change requests</dt>
            <dd className="font-semibold">{pendingRequests}</dd>
            <dd>requests</dd>
          </div>
        )}
      </dl>
      {dialog}
    </div>
  );
}