import { InterviewHeader } from "@/components/interview/stages";
import { VoiceRoom } from "@/components/interview/voice-room";
import {
  FullscreenDialogs,
  LeaveBlockerDialog,
} from "./InterviewSessionDialogs";
import type {
  CourseInterviewController,
  InterviewConfig,
  InterviewCourse,
} from "./use-course-interview";

/**
 * Voice session active (LiveKit room) — moved verbatim out of
 * course-interview.tsx.
 */
export function InterviewVoiceScreen({
  iv,
  course,
  config,
  sessionId,
}: {
  iv: CourseInterviewController;
  course: InterviewCourse;
  config: InterviewConfig;
  sessionId: string;
}) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <InterviewHeader
        slug={iv.slug}
        courseName={course.title}
        interviewTitle={config.title}
        elapsed={iv.elapsed}
        timerActive={iv.assessmentStartedAtMs !== null}
        assessmentStartedAtMs={iv.assessmentStartedAtMs}
        expectedDurationMinutes={config.time_limit_minutes}
        currentQuestion={null}
        totalQuestions={iv.totalQuestions}
        connected={iv.connected}
        voiceOn={iv.voiceOn}
        onToggleVoice={() => iv.setVoiceOn((current) => !current)}
        showVoiceControl={false}
      />
      <VoiceRoom
        sessionId={sessionId}
        elapsed={iv.elapsed}
        initialTranscript={iv.voiceInitialTranscriptRef.current}
        onCompleted={iv.handleVoiceCompleted}
        onVoiceDropped={iv.handleVoiceDropped}
        onTranscriptChange={iv.setTranscript}
      />
      <LeaveBlockerDialog iv={iv} />
      <FullscreenDialogs iv={iv} />
    </div>
  );
}
