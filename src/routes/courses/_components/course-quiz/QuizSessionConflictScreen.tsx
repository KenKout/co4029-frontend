import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MonitorCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizSession } from "./types";

export function QuizSessionConflictScreen({
  session,
  slug,
}: {
  session: QuizSession;
  slug: string;
}) {
  const { t } = useTranslation();
  const unavailable = session.sessionConflict === "quiz_session_guard_unavailable";
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="max-w-lg p-10 text-center space-y-4">
        <MonitorCog className="mx-auto h-10 w-10 text-violet-600" aria-hidden="true" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t(
            unavailable
              ? "course_quiz.session_conflict.unavailable_title"
              : "course_quiz.session_conflict.title",
          )}
        </h2>
        <p className="text-sm text-m3-on-surface-variant">
          {t(
            unavailable
              ? "course_quiz.session_conflict.unavailable_description"
              : "course_quiz.session_conflict.description",
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button variant="outline">{t("course_quiz.tab_guard.return_to_list")}</Button>
          </Link>
          {unavailable ? (
            <Button onClick={() => void session.requestResume()}>
              {t("course_quiz.session_conflict.retry")}
            </Button>
          ) : (
            <Button onClick={() => void session.takeoverAndResume()}>
              {t("course_quiz.session_conflict.takeover")}
            </Button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
