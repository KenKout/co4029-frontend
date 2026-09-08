import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  DiscussionComment,
  DiscussionTopic,
  DiscussionTopicList,
} from "../types";

/**
 * Which board a topic belongs to. Every comment mutation needs it so it can
 * refresh the right topic list (reply/mention counts live on the card), and
 * a lesson id and a course id are indistinguishable as bare strings.
 */
export interface DiscussionScope {
  kind: "lesson" | "course";
  id: string;
}

/** Topic-list key for a scope — the one place the two boards converge. */
function topicsKey(scope: DiscussionScope) {
  return queryKeys.discussions.topics(scope.kind, scope.id);
}

// ── Topics ──────────────────────────────────────────────────────────────

/** Topics on a lesson + whether the viewer may manage (post/edit/close). */
export function useLessonDiscussionTopics(lessonId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.topics("lesson", lessonId ?? ""),
    queryFn: () =>
      apiFetch<DiscussionTopicList>(`/lessons/${lessonId}/discussion/topics`),
    enabled: !!lessonId,
  });
}

/**
 * Course-wide topics. The server admits enrolled students and course
 * managers; a caller who is neither gets 404 rather than an empty list, so
 * the section stays hidden instead of rendering an empty board.
 */
export function useCourseDiscussionTopics(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.topics("course", courseId ?? ""),
    queryFn: () =>
      apiFetch<DiscussionTopicList>(`/courses/${courseId}/discussion/topics`),
    enabled: !!courseId,
  });
}

export function useCreateCourseDiscussionTopic(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; body_markdown?: string | null }) =>
      apiPost<DiscussionTopic>(`/courses/${courseId}/discussion/topics`, body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics("course", courseId),
      });
    },
  });
}

export function useCreateDiscussionTopic(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; body_markdown?: string | null }) =>
      apiPost<DiscussionTopic>(`/lessons/${lessonId}/discussion/topics`, body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.topics("lesson", lessonId),
      });
    },
  });
}

export function useUpdateDiscussionTopic(scope: DiscussionScope) {
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
      qc.invalidateQueries({ queryKey: topicsKey(scope) });
    },
  });
}

export function useDeleteDiscussionTopic(scope: DiscussionScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => apiDelete(`/discussion/topics/${topicId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: topicsKey(scope) });
    },
  });
}

// ── Comments ────────────────────────────────────────────────────────────

export function useTopicComments(topicId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.comments(topicId ?? ""),
    queryFn: () =>
      apiFetch<DiscussionComment[]>(`/discussion/topics/${topicId}/comments`),
    enabled: !!topicId,
  });
}

export function useCreateComment(topicId: string, scope: DiscussionScope) {
  const qc = useQueryClient();
  return useMutation({
    // `parent_comment_id` makes it a reply — and a reply is the only way to
    // name someone, so it is also what earns the recipient's mention badge.
    mutationFn: (body: { body: string; parent_comment_id?: string | null }) =>
      apiPost<DiscussionComment>(
        `/discussion/topics/${topicId}/comments`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.comments(topicId),
      });
      // Refresh the topic list so the reply and mention counts update.
      qc.invalidateQueries({ queryKey: topicsKey(scope) });
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

export function useDeleteComment(topicId: string, scope: DiscussionScope) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      apiDelete(`/discussion/comments/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.discussions.comments(topicId),
      });
      qc.invalidateQueries({ queryKey: topicsKey(scope) });
    },
  });
}
