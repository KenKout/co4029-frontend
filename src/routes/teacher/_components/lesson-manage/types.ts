import type { useLessonManageData } from "./use-lesson-manage-data";
import type { useLessonEditorState } from "./use-lesson-editor-state";
import type { useLessonManageActions } from "./use-lesson-manage-actions";
import type { useLessonAiTwins } from "./use-lesson-ai-twins";
import type { useLessonVideoUpload } from "./use-lesson-video-upload";
import type { useLessonResourceUpload } from "./use-lesson-resource-upload";

/**
 * The state groups the lesson editor is built from. They are passed wholesale
 * into the section components so the page stays a thin orchestrator instead of
 * a 30-prop plumbing exercise.
 */
export type LessonManageData = ReturnType<typeof useLessonManageData>;
export type LessonEditorState = ReturnType<typeof useLessonEditorState>;
export type LessonManageActions = ReturnType<typeof useLessonManageActions>;
export type LessonAiTwins = ReturnType<typeof useLessonAiTwins>;
export type LessonVideoUpload = ReturnType<typeof useLessonVideoUpload>;
export type LessonResourceUpload = ReturnType<typeof useLessonResourceUpload>;
