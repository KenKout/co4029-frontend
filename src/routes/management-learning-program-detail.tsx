import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  useArchiveLearningProgram,
  useDecidePathChange,
  useEnrollProgramStudents,
  useManagedLearningProgram,
  useProgramChangeRequests,
  useProgramRoster,
  usePublishLearningProgram,
} from "@/lib/api/hooks/learning-programs";

export default function ManagementLearningProgramDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const program = useManagedLearningProgram(id);
  const roster = useProgramRoster(id);
  const requests = useProgramChangeRequests(id);
  const publish = usePublishLearningProgram(id);
  const archive = useArchiveLearningProgram(id);
  const enroll = useEnrollProgramStudents(id);
  const decide = useDecidePathChange(id);
  const [studentIds, setStudentIds] = useState("");

  if (program.isLoading) return <PageSkeleton rows={4} />;
  if (!program.data) return <p>Learning Program not found.</p>;
  const data = program.data;

  async function mutateAction(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <Link to="/management/learning-programs" className="inline-flex items-center gap-2 text-sm font-semibold text-m3-primary">
        <ArrowLeft className="h-4 w-4" /> Learning Programs
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-3xl font-black">{data.name}</h1>
            <span className="rounded-full bg-m3-surface-container px-3 py-1 text-xs font-semibold">{data.status}</span>
          </div>
          <p className="mt-2 text-m3-on-surface-variant">Version {data.current_version.version_no} · switch limit {data.current_version.max_path_switches}</p>
        </div>
        <div className="flex gap-2">
          {data.current_version.status === "draft" && (
            <Button onClick={() => void mutateAction(() => publish.mutateAsync(), "Program published")}>Publish</Button>
          )}
          {data.status !== "archived" && (
            <Button variant="outline" onClick={() => void mutateAction(() => archive.mutateAsync(), "Program archived")}>Archive</Button>
          )}
        </div>
      </header>

      <section className="rounded-2xl bg-card ghost-border p-5">
        <h2 className="font-headline font-bold text-lg">Pinned Career Paths</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.paths.map((path) => (
            <div key={path.career_path_id} className="rounded-xl bg-m3-surface-container p-4">
              <p className="font-semibold">{path.position}. {path.name}</p>
              <p className="mt-1 text-xs text-m3-on-surface-variant">{path.status} · version {path.career_path_version_id}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card ghost-border p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-headline font-bold text-lg">Roster</h2><p className="text-sm text-m3-on-surface-variant">Students choose a path after enrollment.</p></div>
          <div className="flex gap-2">
            <Input className="w-80" placeholder="Student UUIDs, comma-separated" value={studentIds} onChange={(event) => setStudentIds(event.target.value)} />
            <Button
              className="gap-2"
              disabled={!studentIds.trim() || enroll.isPending || data.status !== "published"}
              onClick={() => void mutateAction(
                () => enroll.mutateAsync(studentIds.split(",").map((value) => value.trim()).filter(Boolean)),
                "Students enrolled",
              )}
            ><UserPlus className="h-4 w-4" /> Enroll</Button>
          </div>
        </div>
        <div className="divide-y divide-m3-outline-variant">
          {(roster.data ?? []).map((item) => {
            const current = item.attempts.find((attempt) => attempt.status === "active");
            const path = item.paths.find((candidate) => candidate.career_path_id === current?.career_path_id);
            return <div key={item.id} className="flex justify-between py-3 text-sm"><span className="font-mono">{item.student_id}</span><span>{item.status} · {path?.name ?? "No path selected"} · {item.current_progress_percent}%</span></div>;
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-card ghost-border p-5 space-y-4">
        <h2 className="font-headline font-bold text-lg">Path change requests</h2>
        {(requests.data ?? []).filter((request) => request.status === "pending").map((request) => (
          <div key={request.id} className="rounded-xl bg-m3-surface-container p-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-mono text-xs">{request.program_enrollment_id}</p><p className="mt-1 text-sm">{request.reason}</p></div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1" onClick={() => void mutateAction(() => decide.mutateAsync({ requestId: request.id, approve: true }), "Path change approved")}><Check className="h-4 w-4" /> Approve</Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => void mutateAction(() => decide.mutateAsync({ requestId: request.id, approve: false }), "Path change rejected")}><X className="h-4 w-4" /> Reject</Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
