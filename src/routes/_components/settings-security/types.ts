/**
 * Shared types for the MFA settings page, extracted from
 * `settings-security.tsx`. Each section owns a small phase machine; keeping the
 * unions here means the section component and its confirm form agree on one
 * definition.
 */

export type EnrollState =
  | { phase: "idle" }
  | {
      phase: "verifying";
      factorId: string;
      secret: string;
      otpauthUrl: string;
      code: string;
    }
  | { phase: "showRecoveryCodes"; codes: string[] };

export type RegenState =
  | { phase: "idle" }
  | { phase: "challenge"; challengeId: string; code: string }
  | { phase: "showCodes"; codes: string[] };

export type DisableState =
  | { phase: "idle" }
  | { phase: "confirm"; mode: "totp" | "recovery"; code: string };
