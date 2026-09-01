import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  LearningProgram,
  LearningProgramCreate,
  LearningProgramAuthoringOptions,
  LearningProgramVersion,
  LearningProgramEnrollment,
  PathChangeRejectionReasonCode,
  PathChangeRequest,
} from "../types";

export function useManagedLearningPrograms(organizationId?: string) {
  const suffix = organizationId ? `?organization_id=${organizationId}` : "";
  return useQuery({
    queryKey: queryKeys.learningPrograms.managementList(organizationId),
    queryFn: () => apiFetch<LearningProgram[]>(`/management/learning-programs${suffix}`),
  });
}

export function useManagedLearningProgram(id?: string) {
  return useQuery({
    queryKey: queryKeys.learningPrograms.detail(id ?? ""),
    queryFn: () => apiFetch<LearningProgram>(`/management/learning-programs/${id}`),
    enabled: Boolean(id),
  });
}

export function useLearningProgramOptions() {
  return useQuery({
    queryKey: queryKeys.learningPrograms.options(),
    queryFn: () => apiFetch<LearningProgramAuthoringOptions>("/management/learning-programs/options"),
  });
}

export function useLearningProgramVersions(id?: string) {
  return useQuery({
    queryKey: queryKeys.learningPrograms.versions(id ?? ""),
    queryFn: () => apiFetch<LearningProgramVersion[]>(`/management/learning-programs/${id}/versions`),
    enabled: Boolean(id),
  });
}

export function useLearningProgramVersion(id?: string, versionId?: string) {
  return useQuery({
    queryKey: queryKeys.learningPrograms.version(id ?? "", versionId ?? ""),
    queryFn: () => apiFetch<LearningProgram>(`/management/learning-programs/${id}/versions/${versionId}`),
    enabled: Boolean(id && versionId),
  });
}

export function useCreateLearningProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LearningProgramCreate) =>
      apiPost<LearningProgram>("/management/learning-programs", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-programs", "management"] }),
  });
}

export function useUpdateLearningProgram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<LearningProgramCreate>) =>
      apiPatch<LearningProgram>(`/management/learning-programs/${id}`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.detail(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.versions(id) });
      void qc.invalidateQueries({ queryKey: ["learning-programs", "management"] });
    },
  });
}

export function usePublishLearningProgram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<LearningProgram>(`/management/learning-programs/${id}/publish`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["learning-programs"] }),
  });
}

export function useArchiveLearningProgram(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<LearningProgram>(`/management/learning-programs/${id}/archive`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["learning-programs"] }),
  });
}

export function useProgramRoster(id: string) {
  return useQuery({
    queryKey: queryKeys.learningPrograms.roster(id),
    queryFn: () => apiFetch<LearningProgramEnrollment[]>(`/management/learning-programs/${id}/students`),
    enabled: Boolean(id),
  });
}

export function useEnrollProgramStudents(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      apiPost<LearningProgramEnrollment[]>(`/management/learning-programs/${id}/students`, {
        student_ids: studentIds,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.roster(id) }),
  });
}

export interface ProgramCsvImportResult {
  enrolled: string[];
  created_users: string[];
  already_enrolled: string[];
  failures: { row_number: number; identifier: string | null; reason: string }[];
}

/**
 * Import a roster file into the program.
 *
 * Unlike `useEnrollProgramStudents`, one bad line does not abort the batch —
 * the response is per-row, so the UI can say which lines failed and why.
 */
export function useImportProgramStudentsCsv(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { csv_text: string }) =>
      apiPost<ProgramCsvImportResult>(
        `/management/learning-programs/${id}/students/import-csv`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.learningPrograms.roster(id),
      });
    },
  });
}

export function useProgramChangeRequests(id: string) {
  return useQuery({
    queryKey: queryKeys.learningPrograms.requests(id),
    queryFn: () => apiFetch<PathChangeRequest[]>(`/management/learning-programs/${id}/path-change-requests`),
    enabled: Boolean(id),
  });
}

export function useDecidePathChange(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, approve, reason, reasonCode }: { requestId: string; approve: boolean; reason?: string; reasonCode?: PathChangeRejectionReasonCode }) =>
      apiPost<PathChangeRequest>(
        `/management/learning-programs/path-change-requests/${requestId}/${approve ? "approve" : "reject"}`,
        // Rejection carries a structured reason CODE (required by the backend)
        // plus optional detail; approval has nothing to justify, so it keeps the
        // bare free-text shape.
        approve
          ? { reason: reason ?? null }
          : { reason_code: reasonCode, reason: reason ?? null },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.requests(programId) });
      void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.roster(programId) });
    },
  });
}

/**
 * Mark a request as being actively reviewed — an acknowledgement, not a
 * decision. Notifies the student that a dean has opened their request and
 * flips the row to `in_progress` for queue filtering.
 */
export function useMarkPathChangeInProgress(programId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiPost<PathChangeRequest>(
        `/management/learning-programs/path-change-requests/${requestId}/in-progress`,
        {},
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.requests(programId) });
    },
  });
}

export function useMyLearningPrograms() {
  return useQuery({
    queryKey: queryKeys.learningPrograms.mine(),
    queryFn: () => apiFetch<LearningProgramEnrollment[]>("/me/learning-program-enrollments"),
  });
}

export function useSelectProgramPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, pathId }: { enrollmentId: string; pathId: string }) =>
      apiPost<LearningProgramEnrollment>(`/me/learning-program-enrollments/${enrollmentId}/select-path`, {
        career_path_id: pathId,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.mine() }),
  });
}

export function useRequestProgramPathChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, pathId, reason }: { enrollmentId: string; pathId: string; reason: string }) =>
      apiPost<PathChangeRequest>(`/me/learning-program-enrollments/${enrollmentId}/path-change-requests`, {
        target_career_path_id: pathId,
        reason,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.mine() }),
  });
}

export function useCancelProgramPathChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiDelete(`/me/learning-program-enrollments/path-change-requests/${requestId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.learningPrograms.mine() }),
  });
}
