import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  useQuizAttemptHeartbeat,
  useReleaseQuizAttemptSession,
  useTakeoverQuizAttemptSession,
} from "@/lib/api/hooks/quizzes";

const HEARTBEAT_MS = 25_000;
const TRANSFER_TIMEOUT_MS = 5_000;
const OWNERSHIP_RETRY_MS = 500;
const CHANNEL_PREFIX = "quiz-attempt:";

type Message =
  | { type: "owner-present"; tabId: string }
  | { type: "transfer-request"; tabId: string }
  | { type: "transfer-ready"; tabId: string };

export interface QuizAttemptTabGuard {
  blocked: boolean;
  surrendered: boolean;
  isOwner: boolean;
  transferPending: boolean;
  serverReplaced: boolean;
  requestTransfer: () => Promise<boolean>;
  releaseServerOwnership: () => Promise<void>;
}

function newTabId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function hasWebLocks(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.locks?.request === "function"
  );
}

/** Coordinates writable quiz workspaces across tabs and heartbeats Redis ownership. */
// The browser lock, tab messaging, and server lease deliberately live in one
// state machine so a transfer cannot move only one layer of ownership.
// eslint-disable-next-line max-lines-per-function
export function useQuizAttemptTabGuard(
  quizId: string,
  attemptId: string | null | undefined,
): QuizAttemptTabGuard {
  const tabIdRef = useRef<string>(newTabId());
  const releaseLockRef = useRef<(() => void) | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const forceTakeoverRef = useRef(false);
  const transferPromiseRef = useRef<Promise<boolean> | null>(null);
  const transferResolveRef = useRef<((acquired: boolean) => void) | null>(null);
  const transferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [surrendered, setSurrendered] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [serverReplaced, setServerReplaced] = useState(false);
  const heartbeat = useQuizAttemptHeartbeat(attemptId);
  const release = useReleaseQuizAttemptSession(attemptId);
  const takeover = useTakeoverQuizAttemptSession(attemptId);

  const settleTransfer = useCallback((acquired: boolean) => {
    if (transferTimeoutRef.current) {
      clearTimeout(transferTimeoutRef.current);
      transferTimeoutRef.current = null;
    }
    transferResolveRef.current?.(acquired);
    transferResolveRef.current = null;
    transferPromiseRef.current = null;
    setTransferPending(false);
  }, []);

  useEffect(() => {
    setBlocked(false);
    setSurrendered(false);
    setIsOwner(false);
    setTransferPending(false);
    setServerReplaced(false);
  }, [attemptId, quizId]);

  useEffect(() => {
    if (!quizId || typeof window === "undefined") return;
    const coordinationKey = `${CHANNEL_PREFIX}${quizId}`;
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(coordinationKey)
        : null;
    channelRef.current = channel;
    const tabId = tabIdRef.current;
    let cancelled = false;
    let acquired = false;
    let fallbackOwner = false;
    let fallbackOwnerSeen = false;
    const fallbackTimer = {
      current: null as ReturnType<typeof setTimeout> | null,
    };
    const retryTimer = {
      current: null as ReturnType<typeof setTimeout> | null,
    };

    const post = (message: Message) => channel?.postMessage(message);
    const acquireFallback = () => {
      if (cancelled || hasWebLocks()) return;
      fallbackOwnerSeen = false;
      // A short leader handshake lets an existing owner answer before this tab
      // claims the fallback. The lexicographically smaller id wins ties.
      post({ type: "owner-present", tabId });
      fallbackTimer.current = setTimeout(() => {
        if (cancelled || fallbackOwner || fallbackOwnerSeen) return;
        fallbackOwner = true;
        acquired = true;
        setBlocked(false);
        setIsOwner(true);
        settleTransfer(true);
        post({ type: "owner-present", tabId });
      }, 120);
    };
    const scheduleOwnershipRetry = (retry: () => void) => {
      if (cancelled || retryTimer.current) return;
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        retry();
      }, OWNERSHIP_RETRY_MS);
    };

    const onMessage = (event: MessageEvent<Message>) => {
      const message = event.data;
      if (!message || message.tabId === tabId) return;
      if (message.type === "owner-present") {
        fallbackOwnerSeen = true;
        if (acquired) {
          // BroadcastChannel does not replay earlier announcements. Reply to
          // a fresh probe so a tab opened after the owner can distinguish an
          // active owner from a stale lock.
          post({ type: "owner-present", tabId });
          return;
        }
        if (!acquired && (!hasWebLocks() || message.tabId < tabId)) {
          setBlocked(true);
          scheduleOwnershipRetry(acquireFallback);
        }
        return;
      }
      if (message.type === "transfer-request" && acquired) {
        setSurrendered(true);
        setIsOwner(false);
        releaseLockRef.current?.();
        releaseLockRef.current = null;
        fallbackOwner = false;
        post({ type: "transfer-ready", tabId });
        return;
      }
      if (message.type === "transfer-ready" && !acquired) {
        setRetryNonce((nonce) => nonce + 1);
      }
    };
    channel?.addEventListener("message", onMessage);

    if (hasWebLocks()) {
      // Hold one quiz-level lock even before an attempt id exists. Otherwise
      // two tabs opened before the first Start click could both create a live
      // workspace before the per-attempt lock was known to the second tab.
      const lockName = coordinationKey;
      const shouldSteal = forceTakeoverRef.current;
      const held = new Promise<void>((resolve) => {
        releaseLockRef.current = resolve;
      });
      const requestLock = () => {
        if (cancelled) return;
        void navigator.locks
          .request(
            lockName,
            shouldSteal ? { steal: true } : { ifAvailable: true },
            async (lock) => {
              if (cancelled) return;
              if (!lock) {
                setBlocked(true);
                post({ type: "owner-present", tabId });
                scheduleOwnershipRetry(requestLock);
                return;
              }
              acquired = true;
              forceTakeoverRef.current = false;
              setIsOwner(true);
              setBlocked(false);
              settleTransfer(true);
              post({ type: "owner-present", tabId });
              await held;
              setIsOwner(false);
            },
          )
          .catch(() => {
            if (!cancelled) {
              setBlocked(true);
              settleTransfer(false);
              scheduleOwnershipRetry(requestLock);
            }
          });
      };
      requestLock();
    } else {
      acquireFallback();
    }

    return () => {
      cancelled = true;
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      releaseLockRef.current?.();
      releaseLockRef.current = null;
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      channelRef.current = null;
      if (acquired) setIsOwner(false);
    };
  }, [attemptId, quizId, retryNonce, settleTransfer]);

  useEffect(() => {
    if (!attemptId || !isOwner || surrendered) return;
    const heartbeatTimer = setInterval(() => {
      heartbeat.mutateAsync().catch((error: unknown) => {
        if (
          error instanceof ApiError &&
          (error.status === 409 || error.code === "quiz_session_replaced")
        ) {
          setServerReplaced(true);
          setIsOwner(false);
        }
      });
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeatTimer);
  }, [attemptId, heartbeat, isOwner, surrendered]);

  const requestTransfer = useCallback(async (): Promise<boolean> => {
    if (!quizId || !blocked) return false;
    if (transferPromiseRef.current) return transferPromiseRef.current;

    setTransferPending(true);
    try {
      // The browser lock protects tabs in this browser; the server takeover
      // protects the same attempt opened from another authenticated session.
      // Both must move as one explicit user action.
      if (attemptId) await takeover.mutateAsync();
    } catch (error) {
      settleTransfer(false);
      throw error;
    }

    const transferPromise = new Promise<boolean>((resolve) => {
      transferResolveRef.current = resolve;
    });
    transferPromiseRef.current = transferPromise;
    transferTimeoutRef.current = setTimeout(
      () => settleTransfer(false),
      TRANSFER_TIMEOUT_MS,
    );

    channelRef.current?.postMessage({
      type: "transfer-request",
      tabId: tabIdRef.current,
    } satisfies Message);
    // `steal` is the browser-supported escape hatch when the former tab is
    // frozen and cannot answer the BroadcastChannel transfer request.
    forceTakeoverRef.current = true;
    setRetryNonce((nonce) => nonce + 1);
    return transferPromise;
  }, [attemptId, blocked, quizId, settleTransfer, takeover]);

  const releaseServerOwnership = useCallback(async () => {
    if (!attemptId) return;
    await release.mutateAsync();
  }, [attemptId, release]);

  return {
    blocked: blocked || serverReplaced,
    surrendered: surrendered || serverReplaced,
    isOwner,
    transferPending,
    serverReplaced,
    requestTransfer,
    releaseServerOwnership,
  };
}
