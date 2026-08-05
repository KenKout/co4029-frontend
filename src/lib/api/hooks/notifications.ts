import { useCallback, useEffect, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage, type Page } from "../use-infinite-page";
import i18n from "@/i18n";
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

/**
 * The full inbox, loaded without a pagination UI: keeps calling `fetchNextPage`
 * until the cursor is exhausted, so the page renders every notification at
 * once (client-side filtering/grouping) instead of an infinite list. Same
 * cache shape as `useNotifications` — the read/delete mutations keep working
 * on it.
 */
export function useAllNotifications(limit = 100) {
  const page = useNotifications(limit);
  const { hasNextPage, isFetchingNextPage, isLoading, fetchNextPage } = page;

  // Pull remaining pages in the background. Guarded by hasNextPage +
  // isFetchingNextPage so the loop can't stack concurrent fetches.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  return page;
}

/**
 * Poll interval (ms) for the unread badge. The badge is the only always-mounted
 * notification surface, so this is what makes new notifications appear without
 * a page reload.
 *
 * 20s is a deliberate compromise: the endpoint is a single indexed COUNT scoped
 * to one user (cheap), but it fires for every signed-in tab, so a much tighter
 * interval multiplies load across the cohort for no perceptible gain. The
 * backend has no SSE/WebSocket channel (every live surface in this codebase
 * polls — see materials status), so introducing push would mean new infra.
 */
const UNREAD_POLL_MS = 20_000;

/**
 * Unread badge count.
 *
 * Refetches on an interval AND on window focus / network reconnect, so the
 * number climbs on its own while the app sits open and snaps up-to-date the
 * moment a backgrounded tab is returned to. `refetchIntervalInBackground` is
 * left off on purpose: a hidden tab doesn't need to poll, and browsers throttle
 * its timers anyway — the focus refetch covers that case.
 */
export function useUnreadCount(options?: {
  enabled?: boolean;
  /** Override the poll interval. Exists so tests don't wait 20s per assertion. */
  pollMs?: number;
}) {
  const pollMs = options?.pollMs ?? UNREAD_POLL_MS;
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () =>
      apiFetch<{ unread: number }>("/me/notifications/unread-count"),
    // Must be under the poll interval, else the scheduled refetch would be
    // served from cache and the badge would never move.
    staleTime: Math.max(0, Math.floor(pollMs / 2)),
    refetchInterval: pollMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: options?.enabled ?? true,
  });
}

type InboxCache = InfiniteData<Page<Notification>, string | undefined>;

const INBOX_KEY = queryKeys.notifications.inbox();
const UNREAD_KEY = queryKeys.notifications.unreadCount();
const PREFS_KEY = queryKeys.notifications.preferences();

/**
 * Keeps the open inbox list in step with the polled unread badge.
 *
 * The badge poll is the only thing on a timer. Polling the inbox directly would
 * be far more expensive: it's an infinite query, so a refetch re-requests EVERY
 * page the user has scrolled through. Instead we watch the count the badge
 * already fetched and invalidate the list only when it actually changes, so a
 * new notification costs one extra request at the moment it arrives rather than
 * N requests every interval.
 *
 * Call this from a component that renders the inbox list.
 */
export function useNotificationInboxSync(options?: { pollMs?: number }) {
  const qc = useQueryClient();
  const { data } = useUnreadCount(options);
  const unread = data?.unread;
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (unread === undefined) return;
    // Skip the first observation: the list has just mounted and fetched.
    if (previous.current !== undefined && previous.current !== unread) {
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
    }
    previous.current = unread;
  }, [unread, qc]);
}

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

// ── Deferred (undoable) deletes ────────────────────────────────────────────

/** One notification staged for deferred deletion. */
export interface PendingNotificationDelete {
  id: string;
  /** Label for the undo banner (notification title). */
  label: string;
}

export interface UsePendingNotificationDeletesResult {
  /** IDs currently staged (hidden from the list, not yet deleted). */
  pendingIds: Set<string>;
  /** Number of notifications in the active combo. */
  comboCount: number;
  /** Whole seconds left before the combo commits. 0 when idle. */
  secondsLeft: number;
  /** Stage a notification for deletion; refreshes the combo timer. */
  queueDelete: (item: PendingNotificationDelete) => void;
  /** Cancel the whole combo — nothing was deleted server-side. */
  undo: () => void;
  /** Commit immediately (skip the countdown). */
  flushNow: () => void;
}

/**
 * Combo-undo for inbox deletion — same deferred pattern as the quiz-question
 * delete (usePendingQuestionDeletes): deletes are staged and hidden
 * immediately, a single 5s countdown runs, and the staged DELETEs are flushed
 * when it expires or the page unmounts. Undo is free because nothing reached
 * the server yet. Per-notification DELETE route (soft-dismiss server-side);
 * the batch fires concurrently and tolerates partial failure.
 */
export function usePendingNotificationDeletes(
  windowMs = 5000,
): UsePendingNotificationDeletesResult {
  const qc = useQueryClient();
  const [pending, setPending] = useState<
    Map<string, PendingNotificationDelete>
  >(new Map());
  const [secondsLeft, setSecondsLeft] = useState(0);
  // Ids whose DELETE is in flight (or whose refetch hasn't landed yet) — keeps
  // rows hidden continuously from click to final state (no reappear flicker).
  const [inFlight, setInFlight] = useState<Set<string>>(() => new Set());

  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  }, []);

  const invalidate = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: INBOX_KEY }),
      qc.invalidateQueries({ queryKey: UNREAD_KEY }),
    ]);
  }, [qc]);

  const commit = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setInFlight((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      try {
        const results = await Promise.allSettled(
          ids.map((id) => apiDelete(`/me/notifications/${id}`)),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(i18n.t("notifications.errors.delete_failed"));
        }
        await invalidate();
      } finally {
        setInFlight((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }
    },
    [invalidate],
  );

  const undo = useCallback(() => {
    clearTimers();
    setPending(new Map());
    setSecondsLeft(0);
  }, [clearTimers]);

  const flushNow = useCallback(() => {
    clearTimers();
    const ids = [...pendingRef.current.keys()];
    setPending(new Map());
    setSecondsLeft(0);
    void commit(ids);
  }, [clearTimers, commit]);

  const queueDelete = useCallback(
    (item: PendingNotificationDelete) => {
      setPending((prev) => {
        const next = new Map(prev);
        next.set(item.id, item);
        return next;
      });
      clearTimers();
      deadline.current = Date.now() + windowMs;
      setSecondsLeft(Math.ceil(windowMs / 1000));
      tickTimer.current = setInterval(() => {
        const remainingMs = deadline.current - Date.now();
        setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      }, 250);
      commitTimer.current = setTimeout(() => {
        clearTimers();
        const ids = [...pendingRef.current.keys()];
        setPending(new Map());
        setSecondsLeft(0);
        void commit(ids);
      }, windowMs);
    },
    [clearTimers, commit, windowMs],
  );

  // On unmount (navigate away mid-combo), flush staged deletes so the intent
  // isn't silently lost. Runs once.
  useEffect(() => {
    return () => {
      const ids = [...pendingRef.current.keys()];
      if (ids.length > 0) {
        if (commitTimer.current) clearTimeout(commitTimer.current);
        if (tickTimer.current) clearInterval(tickTimer.current);
        void commit(ids);
      }
    };
  }, []);

  return {
    pendingIds: new Set([...pending.keys(), ...inFlight]),
    comboCount: pending.size,
    secondsLeft,
    queueDelete,
    undo,
    flushNow,
  };
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
