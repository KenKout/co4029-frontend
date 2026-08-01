/**
 * Answer input surfaces: the two composers (inline + focused room), the
 * voice/type mode controls, and their shared keycap hint and recording timer.
 *
 * Extracted from the former `interview-workspace.tsx` (step 6 of its
 * decomposition; what remained is now `stages.tsx`), then split again into
 * `./composer/` one file per component. This module stays the public entry
 * point so every existing consumer keeps importing the same four names from
 * the same path.
 */

export { AnswerComposer } from "./composer/AnswerComposer";
export { AnswerControls } from "./composer/AnswerControls";
export { FocusedAnswerComposer } from "./composer/FocusedAnswerComposer";
export { InterviewControls } from "./composer/InterviewControls";
