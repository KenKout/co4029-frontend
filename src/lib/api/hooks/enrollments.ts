import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  BulkEnrollResult,
  EnrollmentAuthoring,
  InvitationCodeAuthoring,
  InvitationCodeCreate,
  InvitationCodePatch,
} from "../types";

/* ── Roster (HOD/Manager/Admin) ──────────────────────────────────────── */

export function useDeptEnrollments(courseId: string) {
  return useQuery({
    queryKey: queryKeys.enrollments.list(courseId),
    queryFn: () =>
      apiFetch<EnrollmentAuthoring[]>(`/dept/courses/${courseId}/enrollments`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
  });
}

/* ── Bulk enroll (UUIDs + emails) ────────────────────────────────────── */

export interface BulkEnrollPayload {
  user_ids?: string[];
  emails?: string[];
}

export function useBulkEnroll(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkEnrollPayload) =>
      apiPost<BulkEnrollResult>(
        `/management/courses/${courseId}/enrollments/bulk`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.enrollments.list(courseId),
      });
    },
  });
}

/* ── CSV import ──────────────────────────────────────────────────────── */

export interface CsvImportPayload {
  csv_text?: string;
  csv_base64?: string;
}

export function useImportEnrollmentsCsv(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CsvImportPayload) =>
      apiPost<BulkEnrollResult>(
        `/management/courses/${courseId}/enrollments/import-csv`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.enrollments.list(courseId),
      });
    },
  });
}

/* ── Drop a single enrollment (soft) ─────────────────────────────────── */

export function useDropEnrollment(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiDelete(`/management/courses/${courseId}/enrollments/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.enrollments.list(courseId),
      });
    },
  });
}

/* ── Invitation codes — list + create per course ─────────────────────── */

export function useListInvitationCodes(courseId: string) {
  return useQuery({
    queryKey: queryKeys.enrollments.invitationCodes(courseId),
    queryFn: () =>
      apiFetch<InvitationCodeAuthoring[]>(
        `/management/courses/${courseId}/invitation-codes`,
      ),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
  });
}

export function useCreateInvitationCode(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InvitationCodeCreate) =>
      apiPost<InvitationCodeAuthoring>(
        `/management/courses/${courseId}/invitation-codes`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.enrollments.invitationCodes(courseId),
      });
    },
  });
}

/* ── Invitation codes — patch + delete per code ─────────────────────── */

export function usePatchInvitationCode(codeId: string, courseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InvitationCodePatch) =>
      apiPatch<InvitationCodeAuthoring>(
        `/management/invitation-codes/${codeId}`,
        body,
      ),
    onSuccess: () => {
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.enrollments.invitationCodes(courseId),
        });
      }
    },
  });
}

export function useDeleteInvitationCode(codeId: string, courseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/management/invitation-codes/${codeId}`),
    onSuccess: () => {
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.enrollments.invitationCodes(courseId),
        });
      }
    },
  });
}
