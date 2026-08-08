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
}: {
  iv: CourseInterviewController;
  course: InterviewCourse;
  config: InterviewConfig;
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
      {/* The LiveKit room itself is owned by InterviewRoomProvider (mounted in
          course-interview.tsx above every screen), so VoiceRoom is a consumer:
          no token fetch, no <LiveKitRoom>, and the drop policy lives at the
          provider. That is what keeps ONE room across a hybrid session. */}
      <VoiceRoom
        elapsed={iv.elapsed}
        initialTranscript={iv.voiceInitialTranscriptRef.current}
        onCompleted={iv.handleVoiceCompleted}
        onTranscriptChange={iv.setTranscript}
        // Never-joined (worker unavailable, dispatch never happened) is not a
        // "connection lost" — nothing ever connected. Resume in text with the
        // accurate message; the session is NOT finalized (same resilience
        // rule as a dropped room).
        onAgentNeverJoined={() => {
          void iv.handleVoiceDropped({
            messageKey: "course_interview.agent_failed.body",
          });
        }}
      />
      <LeaveBlockerDialog iv={iv} />
      <FullscreenDialogs iv={iv} />
    </div>
  );
}
