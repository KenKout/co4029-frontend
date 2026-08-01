import { useTranslation } from "react-i18next";
import { Paperclip, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { ResourceCard } from "./ResourceCard";
import type {
  LessonAiTwins,
  LessonEditorState,
  LessonManageData,
  LessonResourceUpload,
} from "./types";

/**
 * Downloadable Resources section (all lesson types): the bulk "fix the student
 * preview" button, the resource card grid (or empty state), the attach
 * dropzone, and the opt-in AI-sync checkbox that governs the NEXT upload.
 */
export function LessonResourcesSection({
  data,
  editor,
  twins,
  resourceUpload,
}: {
  data: LessonManageData;
  editor: LessonEditorState;
  twins: LessonAiTwins;
  resourceUpload: LessonResourceUpload;
}) {
  const { t } = useTranslation();
  const { resources, bulkSetVisibility } = data;
  const { needsPreviewFix, hiddenReadyTwinIds } = twins;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-headline font-bold text-2xl text-m3-primary">
          {t("teacher_lesson_manage.sections.downloadable_resources")}
        </h2>
        {needsPreviewFix && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={bulkSetVisibility.isPending}
            onClick={twins.handleShowAll}
          >
            {bulkSetVisibility.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {t("teacher_lesson_manage.resource_ai.show_all", {
              count: Math.max(hiddenReadyTwinIds.length, 1),
            })}
          </Button>
        )}
      </div>

      {resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onDelete={twins.handleDeleteResource}
              twin={twins.twinForResource(resource)}
              onShown={twins.claimPrimaryIfEmpty}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-m3-surface-container-lowest ghost-border">
          <Paperclip className="h-8 w-8 text-m3-on-surface-variant/40 mb-2" />
          <p className="text-sm text-m3-on-surface-variant">
            No resources attached yet.
          </p>
        </div>
      )}

      <FileDropzone
        onFile={resourceUpload.handleResourceFile}
        busy={editor.attachingResource}
        busyLabel="Uploading…"
        idleTitle="Attach New Resource"
        hint="PDF, ZIP, MP4, XLSX, PPTX, DOCX, and more"
      />

      {/* Opt-in AI sync. Controls whether the NEXT upload is also added
          to the AI Hub (quizzes, search, knowledge graph). Smart-defaulted
          per file type on drop, but the teacher can flip it here first. */}
      <label className="flex items-start gap-2.5 px-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={editor.aiEnabled}
          onChange={(e) => editor.setAiEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-m3-outline-variant accent-m3-secondary cursor-pointer"
        />
        <span className="text-sm text-m3-on-surface-variant">
          <span className="font-semibold text-m3-on-surface">
            {t("teacher_lesson_manage.ai_optin.label")}
          </span>{" "}
          {t("teacher_lesson_manage.ai_optin.hint")}
        </span>
      </label>
    </section>
  );
}
