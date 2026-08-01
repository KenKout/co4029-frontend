import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import type { useAuth } from "@/components/auth/AuthProvider";

/**
 * Shared types for the MFA sign-in step, extracted from `login-mfa.tsx` so the
 * challenge state machine and the presentational pieces agree on one shape.
 */

export type Mode = "totp" | "recovery";

export interface MfaChallengeResponse {
  challenge_id: string;
  expires_at: string;
}

/** AuthProvider's hydration status — "loading" until localStorage is read. */
export type AuthStatus = ReturnType<typeof useAuth>["status"];

/**
 * The whole challenge/verify controller. Handed to the presentational pieces as
 * one object rather than a dozen scalars so the state machine stays in one
 * place and the props cannot drift out of sync.
 */
export interface MfaController {
  mode: Mode;
  setMode: Dispatch<SetStateAction<Mode>>;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  challengeId: string | null;
  isVerifying: boolean;
  isLoadingChallenge: boolean;
  status: AuthStatus;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  requestedRef: RefObject<boolean>;
  requestChallenge: () => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
