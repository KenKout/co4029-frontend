import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  DiscussionComment,
  DiscussionTopic,
  DiscussionTopicList,
} from "../types";

// ── Topics ──────────────────────────────────────────────────────────────

/** Topics on a lesson + whether the viewer may manage (post/edit/close). */
export function useLessonDiscussionTopics(lessonId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.topics(lessonId ?? ""),
    queryFn: () =>
      apiFetch<DiscussionTopicList>(
        `/lessons/${lessonId}/discussion/topics`,
      ),
    enabled: !!lessonId,
  });
}

export function useCreateDiscussionTopic(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; body_markdown?: string | null }) =>
      apiPost<DiscussionTopic>(
        `/lessons/${lessonId}/discussion/topics`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics(lessonId),
      });
    },
  });
}

export function useUpdateDiscussionTopic(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      topicId,
      ...body
    }: {
      topicId: string;
      title?: string;
      body_markdown?: string | null;
      status?: "open" | "closed";
    }) => apiPatch<DiscussionTopic>(`/discussion/topics/${topicId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics(lessonId),
      });
    },
  });
}

export function useDeleteDiscussionTopic(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) =>
      apiDelete(`/discussion/topics/${topicId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics(lessonId),
      });
    },
  });
}

// ── Comments ────────────────────────────────────────────────────────────

export function useTopicComments(topicId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.comments(topicId ?? ""),
    queryFn: () =>
      apiFetch<DiscussionComment[]>(
        `/discussion/topics/${topicId}/comments`,
      ),
    enabled: !!topicId,
  });
}

export function useCreateComment(topicId: string, lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { body: string }) =>
      apiPost<DiscussionComment>(
        `/discussion/topics/${topicId}/comments`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.comments(topicId),
      });
      // Refresh the topic list so the comment_count badge updates.
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics(lessonId),
      });
    },
  });
}

export function useUpdateComment(topicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      apiPatch<DiscussionComment>(`/discussion/comments/${commentId}`, {
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.comments(topicId),
      });
    },
  });
}

export function useDeleteComment(topicId: string, lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      apiDelete(`/discussion/comments/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.comments(topicId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics(lessonId),
      });
    },
  });
}
