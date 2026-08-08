import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiDelete,
  apiFetch,
  apiPatch,
  apiPost,
  apiPut,
  ApiError,
} from "../client";
import { authenticatedFetch } from "../../auth";
import { queryKeys } from "../query-keys";
import type {
  ChunkPreview,
  CuratedKGDraft,
  CuratedKGDraftSave,
  CuratedKGPublished,
  MaterialPublic,
  MaterialStreamUrl,
  MaterialUpdate,
  MaterialUploadComplete,
  MaterialUploadInit,
  MaterialUploadInitOut,
  MaterialAuthoring,
  MaterialVersionAuthoring,
  MultipartAbortIn,
  MultipartCompleteIn,
  MultipartPartsOut,
  ReprocessOut,
  UploadCompleteOut,
} from "../types";
import type { StreamUrlResponse } from "../types/common";
import type {
  LearningMaterial,
  LessonKnowledgeGraph,
  MaterialStatus,
  ProcessingSummary,
  UploadUrlResponse,
} from "../types/teacher";

function retryUnless404(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) return false;
  return failureCount < 3;
}

export function useMaterial(materialId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.materials.detail(materialId ?? ""),
    queryFn: () => apiFetch<MaterialPublic>(`/materials/${materialId}`),
    enabled: !!materialId,
    staleTime: 5 * 60_000,
    retry: retryUnless404,
  });
}

export function useStreamUrl(materialId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.materials.streamUrl(materialId ?? ""),
    queryFn: () =>
      apiFetch<MaterialStreamUrl>(`/materials/${materialId}/stream-url`),
    enabled: !!materialId,
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: retryUnless404,
  });
}

export const useMaterialStreamUrl = useStreamUrl;

export function useChunksPreview(
  materialId: string | null | undefined,
  limit?: number,
) {
  const clampedLimit =
    limit !== undefined ? Math.max(1, Math.min(20, limit)) : undefined;
  const qs = clampedLimit !== undefined ? `?limit=${clampedLimit}` : "";

  return useQuery({
    queryKey: queryKeys.materials.chunksPreview(materialId ?? "", clampedLimit),
    queryFn: () =>
      apiFetch<ChunkPreview[]>(`/materials/${materialId}/chunks/preview${qs}`),
    enabled: !!materialId,
    staleTime: 5 * 60_000,
    retry: retryUnless404,
  });
}

const MATERIAL_BUSY_STATUSES = [
  "pending",
  "extracting",
  "chunking",
  "embedding",
  "enriching",
  "building_kg",
] as const;

function isMaterialBusy(status: string | null | undefined): boolean {
  return status != null && (MATERIAL_BUSY_STATUSES as readonly string[]).includes(status);
}

export function useTeacherLessonMaterials(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "materials"],
    queryFn: () =>
      apiFetch<LearningMaterial[]>(`/teacher/lessons/${lessonId}/materials`),
    enabled: !!lessonId,
    staleTime: 1000 * 30,
    // Poll while any material is still processing so the per-resource AI
    // status badges on "Downloadable Resources" flip to ready the moment the
    // pipeline finishes — without this the list is fetched once and the badge
    // stays "processing" forever while the history summary (separate query)
    // already reports ready, contradicting itself on the same page.
    refetchInterval: (query) => {
      const materials = query.state.data;
      if (materials?.some((m) => isMaterialBusy(m.latest_version?.processing_status))) {
        return 3000;
      }
      return false;
    },
  });
}

/**
 * Soft-deleted materials on a lesson within the backend retention window
 * (30 days). Backs the "Recently deleted" recovery view in the AI Hub.
 */
export function useTeacherDeletedMaterials(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "materials", "deleted"],
    queryFn: () =>
      apiFetch<LearningMaterial[]>(
        `/teacher/lessons/${lessonId}/materials/deleted`,
      ),
    enabled: !!lessonId,
    staleTime: 1000 * 30,
  });
}

/**
 * Restore (undelete) a soft-deleted material. Auth is lesson-scoped on the
 * backend because a tombstoned material can't resolve course context via the
 * material-level dependency. Refreshes both the active and deleted lists.
 */
export function useRestoreMaterial(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (materialId: string) =>
      apiPost<MaterialAuthoring>(
        `/teacher/lessons/${lessonId}/materials/${materialId}/restore`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["teacher", "lessons", lessonId, "materials"],
      });
      qc.invalidateQueries({
        queryKey: ["teacher", "lessons", lessonId, "materials", "deleted"],
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
    },
  });
}

export function useTeacherMaterial(materialId: string | null | undefined) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "detail"],
    queryFn: () =>
      apiFetch<MaterialAuthoring>(`/teacher/materials/${materialId}`),
    enabled: !!materialId,
    staleTime: 1000 * 30,
    retry: retryUnless404,
  });
}

export function useTeacherMaterialStatus(materialId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "status"],
    queryFn: () =>
      apiFetch<MaterialStatus>(
        `/teacher/materials/${materialId}/processing-summary`,
      ),
    enabled: !!materialId,
    refetchInterval: (query) => {
      const status = query.state.data?.processing_status;
      if (
        status &&
        [
          "pending",
          "extracting",
          "chunking",
          "embedding",
          "enriching",
          "building_kg",
        ].includes(status)
      )
        return 3000;
      return false;
    },
  });
}

export function useTeacherProcessingSummary(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["teacher", "lessons", lessonId, "processing-summary"],
    queryFn: () =>
      apiFetch<ProcessingSummary>(
        `/teacher/lessons/${lessonId}/processing-summary`,
      ),
    enabled: !!lessonId,
  });
}

export function useTeacherLessonKnowledgeGraph(
  lessonId: string | undefined,
  readyCount: number,
  // Backend caps at 60. The compact preview uses the server default (24);
  // the full-screen detail view requests the fuller graph so students/teachers
  // see more of the concept map. Part of the query key so the two views cache
  // independently instead of clobbering each other.
  limit?: number,
) {
  return useQuery({
    // readyCount is part of the key so the graph refetches when a new
    // material finishes processing (the KG only exists post-ingest).
    queryKey: [
      "teacher",
      "lessons",
      lessonId,
      "knowledge-graph",
      readyCount,
      limit ?? "default",
    ],
    queryFn: () =>
      apiFetch<LessonKnowledgeGraph>(
        `/teacher/lessons/${lessonId}/knowledge-graph${
          limit ? `?limit=${limit}` : ""
        }`,
      ),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 2,
    // Keep the prior graph visible while refetching so it doesn't flicker
    // to empty when readyCount ticks.
    placeholderData: (prev) => prev,
  });
}

// ---------------------------------------------------------------------------
// Teacher-curated, publishable knowledge graph (separate from the AI KG above).
// ---------------------------------------------------------------------------

function curatedKgKey(lessonId: string | undefined) {
  return ["teacher", "lessons", lessonId, "curated-knowledge-graph"] as const;
}

/** Teacher's editable KG draft (seeded from the AI KG on first open). */
export function useCuratedKnowledgeGraph(lessonId: string | undefined) {
  return useQuery({
    queryKey: curatedKgKey(lessonId),
    queryFn: () =>
      apiFetch<CuratedKGDraft>(
        `/teacher/lessons/${lessonId}/curated-knowledge-graph`,
      ),
    enabled: !!lessonId,
    // The draft is the editing source of truth — don't silently refetch and
    // clobber in-progress local edits. The editor manages its own state and
    // invalidates on save/publish.
    staleTime: Infinity,
    retry: retryUnless404,
  });
}

/** Save the teacher's draft (PUT upsert). Server validates exactly-one-primary. */
export function useSaveCuratedKnowledgeGraph(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CuratedKGDraftSave) =>
      apiPut<CuratedKGDraft>(
        `/teacher/lessons/${lessonId}/curated-knowledge-graph`,
        payload,
      ),
    onSuccess: (data) => {
      qc.setQueryData(curatedKgKey(lessonId), data);
    },
  });
}

/** Publish the current draft to the student reading-lesson view. */
export function usePublishCuratedKnowledgeGraph(lessonId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<CuratedKGDraft>(
        `/teacher/lessons/${lessonId}/curated-knowledge-graph/publish`,
      ),
    onSuccess: (data) => {
      qc.setQueryData(curatedKgKey(lessonId), data);
    },
  });
}

/** Roll back a publish: students lose the KG panel, the draft stays intact. */
export function useUnpublishCuratedKnowledgeGraph(
  lessonId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<CuratedKGDraft>(
        `/teacher/lessons/${lessonId}/curated-knowledge-graph/unpublish`,
      ),
    onSuccess: (data) => {
      qc.setQueryData(curatedKgKey(lessonId), data);
    },
  });
}

/** Student-facing read of the PUBLISHED curated KG for a lesson. */
export function usePublishedLessonKnowledgeGraph(
  lessonId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["materials", "lessons", lessonId, "published-knowledge-graph"],
    queryFn: () =>
      apiFetch<CuratedKGPublished>(
        `/materials/lessons/${lessonId}/knowledge-graph`,
      ),
    enabled: !!lessonId,
    staleTime: 1000 * 60 * 5,
    retry: retryUnless404,
  });
}

export function useTeacherMaterialStreamUrl(
  materialId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["teacher", "materials", materialId, "stream-url"],
    queryFn: () =>
      apiFetch<StreamUrlResponse>(
        `/teacher/materials/${materialId}/stream-url`,
      ),
    enabled: !!materialId,
    staleTime: 1000 * 60 * 4,
  });
}

/**
 * @deprecated Legacy `/materials/upload-url` flow — no longer exists in
 * backend-new. Use `useInitMaterialUpload` + `useCompleteMaterialUpload`
 * for materials. Lesson-resource uploads still depend on this hook until
 * W4.4 migrates them; do not delete until then.
 */
export function useTeacherRequestUploadUrl() {
  return useMutation({
    mutationFn: (payload: {
      original_filename: string;
      mime_type: string;
      size_bytes?: number;
    }) => apiPost<UploadUrlResponse>("/materials/upload-url", payload),
  });
}

/**
 * Link an existing storage object to the AI Material Hub for a lesson.
 * No upload flow, no AI processing triggered.
 */
export function useCreateMaterial(
  courseId: string,
  moduleId: string,
  lessonId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      material_type: string;
      storage_object_id?: string;
      ai_processing_enabled?: boolean;
      visible_to_students?: boolean;
    }) =>
      apiPost<LearningMaterial>(
        `/teacher/lessons/${lessonId}/materials/link`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["teacher", "lessons", lessonId, "materials"],
      });
    },
  });
}

export function useInitMaterialUpload(lessonId: string) {
  return useMutation({
    mutationFn: (payload: MaterialUploadInit) =>
      apiPost<MaterialUploadInitOut>(
        `/teacher/lessons/${lessonId}/materials/init-upload`,
        payload,
      ),
  });
}

export function useCompleteMaterialUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      materialId,
      versionId,
      payload,
    }: {
      materialId: string;
      versionId: string;
      payload: MaterialUploadComplete;
    }) =>
      apiPost<UploadCompleteOut>(
        `/teacher/materials/${materialId}/versions/${versionId}/complete`,
        payload,
      ),
    onSuccess: (_data, { materialId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialId),
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useFetchMultipartParts() {
  return useMutation({
    mutationFn: ({
      materialId,
      versionId,
      uploadId,
      from,
      count,
    }: {
      materialId: string;
      versionId: string;
      uploadId: string;
      from?: number;
      count?: number;
    }) => {
      const params = new URLSearchParams({ upload_id: uploadId });
      if (from !== undefined) params.set("from", String(from));
      if (count !== undefined) params.set("count", String(count));
      return apiPost<MultipartPartsOut>(
        `/teacher/materials/${materialId}/versions/${versionId}/multipart/parts?${params.toString()}`,
      );
    },
  });
}

export function useCompleteMultipartUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      materialId,
      versionId,
      payload,
    }: {
      materialId: string;
      versionId: string;
      payload: MultipartCompleteIn;
    }) => {
      const res = await authenticatedFetch(
        `/teacher/materials/${materialId}/versions/${versionId}/multipart/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok && res.status !== 204) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body, res.statusText);
      }
    },
    onSuccess: (_data, { materialId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialId),
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useAbortMultipartUpload() {
  return useMutation({
    mutationFn: async ({
      materialId,
      versionId,
      payload,
    }: {
      materialId: string;
      versionId: string;
      payload: MultipartAbortIn;
    }) => {
      const res = await authenticatedFetch(
        `/teacher/materials/${materialId}/versions/${versionId}/multipart/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok && res.status !== 204) {
        const body = await res.text().catch(() => "");
        throw new ApiError(res.status, body, res.statusText);
      }
    },
  });
}

export function useReprocessMaterial(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<ReprocessOut>(`/teacher/materials/${materialId}/reprocess`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.materials.processing(materialId),
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

/** FR-3.4 — version history (newest first) with per-version processing state. */
export function useMaterialVersions(materialId: string | null) {
  return useQuery({
    queryKey: queryKeys.materials.versions(materialId ?? ""),
    queryFn: () =>
      apiFetch<MaterialVersionAuthoring[]>(
        `/teacher/materials/${materialId}/versions`,
      ),
    enabled: !!materialId,
    staleTime: 1000 * 30,
  });
}

/** FR-3.4 — pointer-swap rollback to a prior ready version. */
export function useRollbackMaterialVersion(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      apiPost<MaterialVersionAuthoring>(
        `/teacher/materials/${materialId}/versions/${versionId}/rollback`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.materials.versions(materialId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.materials.processing(materialId),
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useUpdateMaterial(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialUpdate) =>
      apiPatch<MaterialAuthoring>(`/teacher/materials/${materialId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialId),
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

export function useDeleteMaterial(materialId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/materials/${materialId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.materials.detail(materialId),
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
      qc.invalidateQueries({ queryKey: ["teacher", "materials", materialId] });
    },
  });
}

/**
 * Bulk-set `visible_to_students` on many materials at once (one PATCH each,
 * fired in parallel). Backs the lesson-page "Show all to students" action so a
 * teacher doesn't have to flip every AI-synced doc individually. Resolves with
 * the count actually updated; rejects only if every PATCH fails (partial
 * success still resolves so the UI can report "N of M").
 */
export function useBulkSetMaterialVisibility(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { materialIds: string[]; visible: boolean }) => {
      const results = await Promise.allSettled(
        input.materialIds.map((id) =>
          apiPatch<MaterialAuthoring>(`/teacher/materials/${id}`, {
            visible_to_students: input.visible,
          }),
        ),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      // All failed → surface as an error so onError fires.
      if (succeeded === 0 && results.length > 0) {
        throw new Error("Failed to update visibility for any material");
      }
      return { succeeded, failed, total: results.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["teacher", "lessons", lessonId, "materials"],
      });
      qc.invalidateQueries({ queryKey: ["teacher", "lessons"] });
    },
  });
}
