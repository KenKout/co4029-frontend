import { VideoContent } from "./VideoContent";
import { ReadingContent } from "./ReadingContent";
import { MaterialHistorySection } from "./MaterialHistorySection";
import { LessonHeaderSection } from "./LessonHeaderSection";
import { LessonResourcesSection } from "./LessonResourcesSection";
import { LessonKnowledgeGraphSection } from "./LessonKnowledgeGraphSection";
import { LessonDiscussionSection } from "./LessonDiscussionSection";
import type {
  LessonAiTwins,
  LessonEditorState,
  LessonManageData,
  LessonResourceUpload,
  LessonVideoUpload,
} from "./types";

/**
 * The 8-column main editor stack: lesson header, the per-type content area
 * (video player + notes, or the reading editor), downloadable resources,
 * material history, and the knowledge graph.
 */
export function LessonEditorMain({
  data,
  editor,
  twins,
  videoUpload,
  resourceUpload,
  typeLabel,
}: {
  data: LessonManageData;
  editor: LessonEditorState;
  twins: LessonAiTwins;
  videoUpload: LessonVideoUpload;
  resourceUpload: LessonResourceUpload;
  typeLabel: string;
}) {
  return (
    <div className="col-span-12 lg:col-span-8 space-y-10">
      {/* ── Editable lesson header ── */}
      <LessonHeaderSection
        typeLabel={typeLabel}
        title={editor.title}
        setTitle={editor.setTitle}
        titleEditing={editor.titleEditing}
        setTitleEditing={editor.setTitleEditing}
        summary={editor.summary}
        setSummary={editor.setSummary}
      />

      {/* ── Per-type content area ── */}
      {editor.lessonType === "video" && (
        <VideoContent
          notes={editor.notes}
          setNotes={editor.setNotes}
          notesRef={editor.notesRef}
          estimatedMinutes={editor.estimatedMinutes}
          streamUrl={data.videoStreamData?.stream_url}
          onVideoUpload={videoUpload.handleVideoUpload}
          uploading={editor.uploadingVideo}
        />
      )}
      {editor.lessonType === "reading" && (
        <ReadingContent
          notes={editor.notes}
          setNotes={editor.setNotes}
          notesRef={editor.notesRef}
        />
      )}

      {/* ── Downloadable Resources (all types) ── */}
      <LessonResourcesSection
        data={data}
        editor={editor}
        twins={twins}
        resourceUpload={resourceUpload}
      />

      {/* ── Material history (folded in from the former AI Material Hub) ──
          Live processing progress + processed-material list +
          recently-deleted. Upload happens once via Downloadable Resources
          above. Same component for reading and video lessons. */}
      <MaterialHistorySection lessonId={data.lessonId} />

      <LessonKnowledgeGraphSection
        lessonId={data.lessonId}
        readyCount={data.aiMaterials.filter((m) => m.current_version_id).length}
      />

      {/* ── Discussion topics — same panel students see, manage-gated ── */}
      <LessonDiscussionSection lessonId={data.lessonId} />
    </div>
  );
}
