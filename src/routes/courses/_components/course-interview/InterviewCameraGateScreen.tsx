import { Camera, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { InterviewCameraController } from "@/lib/quiz/use-quiz-camera";

/**
 * The mandatory CAMERA gate screen for interviews — the camera counterpart of
 * InterviewFullscreenGateScreen. Rendered by BOTH routes instead of the
 * workspace whenever a live session's required camera is not live: never
 * granted at start (the gate holds the start sequence), or the device died
 * mid-interview and the debounce elapsed.
 *
 * The preview and the privacy copy mirror the quiz camera screens: this is a
 * local monitor, not a capture pipeline — no recording, no upload, no
 * analysis, and the LiveKit room is torn down while this screen is up
 * (interviewRoomProps zeroes every capability), so nothing reaches the
 * interviewer agent either.
 */
export function InterviewCameraGateScreen({
  camera,
}: {
  camera: InterviewCameraController;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="max-w-lg p-10 text-center space-y-4">
        <Camera className="mx-auto h-10 w-10 text-violet-600" aria-hidden="true" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface">
          {t("course_interview.camera.required_title")}
        </h2>
        <p className="text-sm text-m3-on-surface-variant">
          {camera.stream
            ? t("course_interview.camera.interrupted_description")
            : t("course_interview.camera.required_description")}
        </p>
        <InterviewCameraPreview camera={camera} />
        <p className="text-xs text-m3-on-surface-variant">
          {t("course_interview.camera.privacy")}
        </p>
        <Button onClick={() => void camera.retry()} disabled={camera.checking}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {camera.checking
            ? t("course_interview.camera.checking")
            : t("course_interview.camera.turn_back_on")}
        </Button>
      </GlassCard>
    </div>
  );
}

/** Local monitor of the gate's stream; renders nothing without one. */
export function InterviewCameraPreview({
  camera,
}: {
  camera: InterviewCameraController;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = camera.stream;
  }, [camera.stream]);
  if (!camera.stream) return null;
  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="mx-auto h-28 w-44 rounded-lg object-cover bg-black"
      aria-label={t("course_interview.camera.preview_aria")}
    />
  );
}

/**
 * Start-time camera error notice for the LOBBY: the start sequence refuses
 * before fullscreen when the camera gate fails, and this is where the reason
 * shows — no toast, the candidate stays on the screen they acted from.
 */
export function InterviewCameraErrorNotice({
  camera,
}: {
  camera: InterviewCameraController;
}) {
  const { t } = useTranslation();
  if (!camera.error) return null;
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <p className="font-semibold">
        {t("course_interview.camera.required_title")}
      </p>
      <p className="mt-1">
        {t(`course_interview.camera.errors.${camera.error}`)}
      </p>
      <Button
        className="mt-3"
        variant="outline"
        onClick={() => void camera.retry()}
        disabled={camera.checking}
      >
        {camera.checking
          ? t("course_interview.camera.checking")
          : t("course_interview.camera.try_again")}
      </Button>
    </div>
  );
}
