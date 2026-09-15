import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  useQuizAttemptHeartbeat,
  useReleaseQuizAttemptSession,
} from "@/lib/api/hooks/quizzes";

const HEARTBEAT_MS = 25_000;
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
  requestTransfer: () => void;
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
export function useQuizAttemptTabGuard(
  quizId: string,
  attemptId: string | null | undefined,
): QuizAttemptTabGuard {
  const tabIdRef = useRef<string>(newTabId());
  const releaseLockRef = useRef<(() => void) | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [surrendered, setSurrendered] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [serverReplaced, setServerReplaced] = useState(false);
  const heartbeat = useQuizAttemptHeartbeat(attemptId);
  const release = useReleaseQuizAttemptSession(attemptId);

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
    const fallbackTimer = { current: null as ReturnType<typeof setTimeout> | null };

    const post = (message: Message) => channel?.postMessage(message);
    const acquireFallback = () => {
      if (cancelled || hasWebLocks()) return;
      // A short leader handshake lets an existing owner answer before this tab
      // claims the fallback. The lexicographically smaller id wins ties.
      post({ type: "owner-present", tabId });
      fallbackTimer.current = setTimeout(() => {
        if (cancelled || fallbackOwner) return;
        fallbackOwner = true;
        acquired = true;
        setBlocked(false);
        setIsOwner(true);
        post({ type: "owner-present", tabId });
      }, 120);
    };

    const onMessage = (event: MessageEvent<Message>) => {
      const message = event.data;
      if (!message || message.tabId === tabId) return;
      if (message.type === "owner-present") {
        if (!acquired && (!hasWebLocks() || message.tabId < tabId)) {
          setBlocked(true);
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
        setTransferPending(false);
        setRetryNonce((nonce) => nonce + 1);
      }
    };
    channel?.addEventListener("message", onMessage);

    if (hasWebLocks()) {
      // Hold one quiz-level lock even before an attempt id exists. Otherwise
      // two tabs opened before the first Start click could both create a live
      // workspace before the per-attempt lock was known to the second tab.
      const lockName = coordinationKey;
      const held = new Promise<void>((resolve) => {
        releaseLockRef.current = resolve;
      });
      void navigator.locks
        .request(lockName, { ifAvailable: true }, async (lock) => {
          if (cancelled || !lock) {
            setBlocked(true);
            post({ type: "owner-present", tabId });
            return;
          }
          acquired = true;
          setIsOwner(true);
          setBlocked(false);
          post({ type: "owner-present", tabId });
          await held;
          setIsOwner(false);
        })
        .catch(() => {
          if (!cancelled) setBlocked(true);
        });
    } else {
      acquireFallback();
    }

    return () => {
      cancelled = true;
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      releaseLockRef.current?.();
      releaseLockRef.current = null;
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      channelRef.current = null;
      if (acquired) setIsOwner(false);
    };
  }, [attemptId, quizId, retryNonce]);

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

  const requestTransfer = useCallback(() => {
    if (!quizId || !blocked) return;
    setTransferPending(true);
    channelRef.current?.postMessage({
      type: "transfer-request",
      tabId: tabIdRef.current,
    } satisfies Message);
  }, [blocked, quizId]);

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
