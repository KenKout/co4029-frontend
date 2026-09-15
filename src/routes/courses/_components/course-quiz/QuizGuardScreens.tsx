import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Camera, LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { QuizAttemptTabGuard } from "@/lib/quiz/use-quiz-attempt-tab-guard";
import type { QuizCameraController } from "@/lib/quiz/use-quiz-camera";
import type { QuizSession } from "./types";
import { QuizSessionConflictScreen } from "./QuizSessionConflictScreen";

export function getQuizBlockingStage({
  session,
  slug,
}: {
  session: QuizSession;
  slug: string;
}): ReactNode {
  if (session.sessionConflict) {
    return <QuizSessionConflictScreen session={session} slug={slug} />;
  }
  if (session.tabGuard.blocked) {
    return <QuizTabGuardScreen guard={session.tabGuard} slug={slug} />;
  }
  if (
    !session.submittedSummary &&
    session.taking &&
    session.displayQuestions.length > 0 &&
    session.camera.required &&
    !session.camera.active
  ) {
    return <QuizCameraRequiredScreen camera={session.camera} />;
  }
  return null;
}

export function QuizTabGuardScreen({
  guard,
  slug,
}: {
  guard: QuizAttemptTabGuard;
  slug: string;
}) {
  const { t } = useTranslation();
  const replaced = guard.surrendered;
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="max-w-lg p-10 text-center space-y-4">
        <LockKeyhole className="mx-auto h-10 w-10 text-violet-600" aria-hidden="true" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t(
            replaced
              ? "course_quiz.session_replaced.title"
              : "course_quiz.tab_guard.title",
          )}
        </h2>
        <p className="text-sm text-m3-on-surface-variant">
          {t(
            replaced
              ? "course_quiz.session_replaced.description"
              : "course_quiz.tab_guard.description",
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button variant="outline">
              {t("course_quiz.tab_guard.return_to_list")}
            </Button>
          </Link>
          {!replaced && (
            <Button
              onClick={guard.requestTransfer}
              disabled={guard.transferPending}
            >
              {guard.transferPending
                ? t("course_quiz.tab_guard.transferring")
                : t("course_quiz.tab_guard.continue_here")}
            </Button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function CameraPreview({ stream }: { stream: MediaStream | null }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="mx-auto h-28 w-44 rounded-lg object-cover bg-black"
      aria-label={t("course_quiz.camera.preview_aria")}
    />
  );
}

export function QuizCameraRequiredScreen({
  camera,
}: {
  camera: QuizCameraController;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="max-w-lg p-10 text-center space-y-4">
        <Camera className="mx-auto h-10 w-10 text-violet-600" aria-hidden="true" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t("course_quiz.camera.required_title")}
        </h2>
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_quiz.camera.interrupted_description")}
        </p>
        <CameraPreview stream={camera.stream} />
        <Button onClick={() => void camera.retry()} disabled={camera.checking}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {camera.checking
            ? t("course_quiz.camera.checking")
            : t("course_quiz.camera.turn_back_on")}
        </Button>
      </GlassCard>
    </div>
  );
}

export function QuizCameraErrorNotice({
  camera,
}: {
  camera: QuizCameraController;
}) {
  const { t } = useTranslation();
  if (!camera.error) return null;
  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">{t("course_quiz.camera.required_title")}</p>
      <p className="mt-1">{t(`course_quiz.camera.errors.${camera.error}`)}</p>
      <Button
        className="mt-3"
        variant="outline"
        onClick={() => void camera.retry()}
        disabled={camera.checking}
      >
        {camera.checking
          ? t("course_quiz.camera.checking")
          : t("course_quiz.camera.try_again")}
      </Button>
    </div>
  );
}

export function QuizCameraPreview({
  camera,
}: {
  camera: QuizCameraController;
}) {
  return camera.required && camera.active ? <CameraPreview stream={camera.stream} /> : null;
}
