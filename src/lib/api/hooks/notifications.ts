import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage, type Page } from "../use-infinite-page";
import type {
  Notification,
  NotificationChannel,
  NotificationCategory,
  NotificationPreferenceRead,
} from "../types";

/**
 * Inbox listing — cursor-paginated.
 *
 * Backend `GET /me/notifications` returns a bare `NotificationRead[]` (no
 * envelope) and accepts `?cursor=<created_at>&limit=<n>`. We adapt that
 * into the `Page<T>` shape `useInfinitePage` expects by deriving
 * `next_cursor` from the last item's `created_at` when the page is full.
 *
 * Caveat: when the total count is an exact multiple of `limit`, the final
 * `fetchNextPage` will resolve to an empty page. That's a one-extra-call
 * cost; acceptable given the backend doesn't surface an explicit
 * `has_next` flag and sentinel-driven IntersectionObserver tolerates it.
 *
 * Server filters out `delivery_status='cancelled'` (dismissed) rows so the
 * inbox only shows live notifications.
 */
export function useNotifications(limit = 20) {
  return useInfinitePage<Notification>({
    queryKey: queryKeys.notifications.inbox(),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (lim) params.set("limit", String(lim));
      const qs = params.toString();
      const items = await apiFetch<Notification[]>(
        qs ? `/me/notifications?${qs}` : "/me/notifications",
      );
      const pageSize = lim ?? limit;
      const next_cursor =
        items.length === pageSize && items.length > 0
          ? items[items.length - 1].created_at
          : null;
      return { items, next_cursor };
    },
    limit,
  });
}

export function useUnreadCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => apiFetch<{ unread: number }>("/me/notifications/unread-count"),
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  });
}

type InboxCache = InfiniteData<Page<Notification>, string | undefined>;

const INBOX_KEY = queryKeys.notifications.inbox();
const UNREAD_KEY = queryKeys.notifications.unreadCount();
const PREFS_KEY = queryKeys.notifications.preferences();

function mapInboxItems(
  cache: InboxCache | undefined,
  fn: (n: Notification) => Notification | null,
): InboxCache | undefined {
  if (!cache) return cache;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((n) => {
        const next = fn(n);
        return next ? [next] : [];
      }),
    })),
  };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiPatch<Notification>(`/me/notifications/${notificationId}/read`),
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: INBOX_KEY });
      const previousInbox = qc.getQueryData<InboxCache>(INBOX_KEY);
      const now = new Date().toISOString();
      qc.setQueryData<InboxCache>(INBOX_KEY, (old) =>
        mapInboxItems(old, (n) =>
          n.id === notificationId && n.read_at === null
            ? { ...n, read_at: now }
            : n,
        ),
      );
      return { previousInbox };
    },
    onError: (_err, _id, context) => {
      if (context?.previousInbox) {
        qc.setQueryData(INBOX_KEY, context.previousInbox);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiDelete(`/me/notifications/${notificationId}`),
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: INBOX_KEY });
      const previousInbox = qc.getQueryData<InboxCache>(INBOX_KEY);
      qc.setQueryData<InboxCache>(INBOX_KEY, (old) =>
        mapInboxItems(old, (n) => (n.id === notificationId ? null : n)),
      );
      return { previousInbox };
    },
    onError: (_err, _id, context) => {
      if (context?.previousInbox) {
        qc.setQueryData(INBOX_KEY, context.previousInbox);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<{ unread: number }>("/me/notifications/mark-all-read"),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: INBOX_KEY });
      await qc.cancelQueries({ queryKey: UNREAD_KEY });
      const previousInbox = qc.getQueryData<InboxCache>(INBOX_KEY);
      const previousUnread = qc.getQueryData<{ unread: number }>(UNREAD_KEY);
      const now = new Date().toISOString();
      qc.setQueryData<InboxCache>(INBOX_KEY, (old) =>
        mapInboxItems(old, (n) =>
          n.read_at === null ? { ...n, read_at: now } : n,
        ),
      );
      qc.setQueryData<{ unread: number }>(UNREAD_KEY, { unread: 0 });
      return { previousInbox, previousUnread };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousInbox) {
        qc.setQueryData(INBOX_KEY, context.previousInbox);
      }
      if (context?.previousUnread) {
        qc.setQueryData(UNREAD_KEY, context.previousUnread);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: PREFS_KEY,
    queryFn: () =>
      apiFetch<NotificationPreferenceRead[]>("/me/notification-preferences"),
    staleTime: 1000 * 60,
  });
}

type PatchPreferenceVars = {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
};

export function usePatchNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, channel, enabled }: PatchPreferenceVars) =>
      apiPatch<NotificationPreferenceRead>(
        `/me/notification-preferences/${category}/${channel}`,
        { enabled },
      ),
    onMutate: async ({ category, channel, enabled }) => {
      await qc.cancelQueries({ queryKey: PREFS_KEY });
      const previous = qc.getQueryData<NotificationPreferenceRead[]>(PREFS_KEY);
      qc.setQueryData<NotificationPreferenceRead[]>(PREFS_KEY, (old) => {
        if (!old) return old;
        const idx = old.findIndex(
          (p) => p.category === category && p.channel === channel,
        );
        if (idx === -1) {
          const stub: NotificationPreferenceRead = {
            id: `optimistic-${category}-${channel}`,
            user_id: "",
            category,
            channel,
            enabled,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return [...old, stub];
        }
        const next = [...old];
        next[idx] = { ...next[idx], enabled };
        return next;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(PREFS_KEY, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: PREFS_KEY });
    },
  });
}
