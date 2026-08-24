import { CheckCircle2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useMyLearningPrograms,
  useSelectProgramPath,
} from "@/lib/api/hooks/learning-programs";

/**
 * "Choose this path" — shown only when this path is actually choosable.
 *
 * The commit lives here rather than on the browse cards because this is the
 * screen that shows the roadmap: how many stages, which courses, what gates
 * each stage. Choosing decides a student's next several months and a later
 * switch needs a Faculty Dean's approval, so the decision belongs next to
 * the evidence, not on a summary tile.
 *
 * Renders nothing unless the student has a program enrolment sitting in
 * `awaiting_path` that offers THIS path — which is also why it is safe to
 * mount on the public path detail: a student browsing the catalog outside
 * any program simply never sees it.
 */
export function ChoosePathBanner({ careerPathId }: { careerPathId: string }) {
  const programs = useMyLearningPrograms();
  const selectPath = useSelectProgramPath();

  const pending = (programs.data ?? []).find(
    (enrollment) =>
      enrollment.status === "awaiting_path" &&
      enrollment.paths.some(
        (path) => path.career_path_id === careerPathId && path.status !== "archived",
      ),
  );
  if (!pending) return null;

  async function choose() {
    if (!pending) return;
    try {
      await selectPath.mutateAsync({
        enrollmentId: pending.id,
        pathId: careerPathId,
      });
      toast.success("Learning path selected");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not select the path",
      );
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-text-strong">
          Choose this path for {pending.program_name}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {/* State the cost of the decision up front — the switch budget is
              finite and enforced server-side. */}
          You can change later {pending.max_path_switches - pending.approved_switch_count} more
          time
          {pending.max_path_switches - pending.approved_switch_count === 1 ? "" : "s"},
          with approval from your Faculty Dean.
        </p>
      </div>
      <Button
        className="gap-2"
        disabled={selectPath.isPending}
        onClick={() => void choose()}
      >
        <CheckCircle2 className="h-4 w-4" />
        {selectPath.isPending ? "Selecting…" : "Choose this path"}
      </Button>
    </section>
  );
}
