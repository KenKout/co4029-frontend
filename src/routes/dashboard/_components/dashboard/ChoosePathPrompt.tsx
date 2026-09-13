import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Signpost } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LearningProgramEnrollment } from "@/lib/api/types";

/**
 * The "you still have to choose a career path" prompt.
 *
 * `awaiting_path` is a REQUIRED action, not a suggestion: until the student
 * commits to a path their program hands them no courses, so the dashboard
 * they land on is empty and every CTA on it points at a catalogue that cannot
 * help. The choosing UI already exists at /me/learning-programs — offered
 * paths as comparison cards — but nothing on the landing screen pointed at
 * it, which left the one student who has a mandatory next step looking at the
 * emptiest version of this page.
 *
 * Rendered ABOVE the stats and course sections for that reason: zeroed
 * counters are a consequence of the unmade choice, so the choice has to come
 * first.
 */
export function ChoosePathPrompt({
  enrollments,
}: {
  enrollments: LearningProgramEnrollment[];
}) {
  const { t } = useTranslation();
  const awaiting = enrollments.filter((e) => e.status === "awaiting_path");
  if (awaiting.length === 0) return null;

  // Naming the programme matters when a student belongs to more than one:
  // "choose a path" is ambiguous, "choose a path for <programme>" is not.
  const first = awaiting[0];
  const offered = first.paths.filter((p) => p.status !== "archived").length;

  return (
    <section className="rounded-xl border border-m3-primary/30 bg-m3-primary-fixed/40 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-m3-primary/10 p-2.5 text-m3-primary">
          <Signpost className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2 className="font-headline text-lg font-bold text-m3-on-surface">
              {t("dashboard.choose_path.title")}
            </h2>
            <p className="mt-0.5 text-sm text-m3-on-surface-variant">
              {awaiting.length > 1
                ? t("dashboard.choose_path.body_many", {
                    count: awaiting.length,
                  })
                : t("dashboard.choose_path.body", {
                    program: first.program_name,
                    count: offered,
                  })}
            </p>
          </div>
          <Link to="/me/learning-programs">
            <Button className="gap-2 font-semibold">
              {t("dashboard.choose_path.cta")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ChoosePathPrompt;
