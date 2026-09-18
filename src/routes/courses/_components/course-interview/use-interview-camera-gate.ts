import {
  useQuizCamera,
  type InterviewCameraController,
} from "@/lib/quiz/use-quiz-camera";

export type { InterviewCameraController };

/**
 * FE-DECIDED camera requirement for interviews. The public interview config
 * carries no camera field, so this is where the policy lives — flip to `true`
 * to enforce the camera gate on every interview start. Kept next to the gate
 * implementation so the flag and its enforcement cannot drift apart.
 */
export const INTERVIEW_CAMERA_REQUIRED = true;

/**
 * The interview camera gate: the quiz camera hook bound to the interview's
 * lifecycle. LOCAL-ONLY by construction (see use-quiz-camera): the stream is
 * held in the browser, never attached to the LiveKit room, never published —
 * the agent worker and the LiveKit server have no way to see it. The gate
 * exists so a candidate cannot sit a proctored interview with the camera
 * off; it is not a capture pipeline.
 *
 * `keepAlive` is the interview-active window (prestart and results release
 * the device). Mid-session the hook keeps watching: a camera that dies
 * (unplug, OS toggle, another app stealing it) flips `active` false after
 * the shared 4-second debounce window — a one-second device hiccup must not
 * kick a candidate out of a graded session — which, through
 * interviewRoomProps, locks the room the same way an unexpected fullscreen
 * exit does.
 */
export function useInterviewCameraGate(
  cameraRequired: boolean,
  keepAlive = true,
): InterviewCameraController {
  const camera = useQuizCamera(cameraRequired, keepAlive);
  // The controller shape already carries everything the start gate, the room
  // props and the guard screen read. Nothing to adapt — return it as-is so
  // there is exactly ONE implementation of the semantics.
  return camera;
}

/**
 * True when the required camera is not delivering an active track. Pure so
 * the screen order, the room props and the start gate read the same rule.
 */
export function cameraGateBlocks(
  camera: InterviewCameraController | undefined | null,
): boolean {
  return Boolean(camera?.required) && !camera?.active;
}
