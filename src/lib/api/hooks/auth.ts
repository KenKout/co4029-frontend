import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { authenticatedFetch } from "../../auth";
import { queryKeys } from "../query-keys";
import type {
  GoogleLoginResponse,
  MfaChallengeResponse,
  MfaDisableRequest,
  MfaEnrollResponse,
  MfaRecoveryCodesResponse,
  MfaStatusResponse,
  MfaTotpVerifyRequest,
  MfaVerifyRequest,
  MyPermissions,
  TokenResponse,
  User,
  UserProfileLink,
  UserProfileLinkIn,
  UserProfileLinkUpdate,
  UserProfileUpdate,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => apiFetch<User>("/users/me"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyPermissions() {
  return useQuery({
    queryKey: queryKeys.auth.permissions(),
    queryFn: () => apiFetch<MyPermissions>("/users/me/permissions"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useGoogleLoginUrl() {
  return useMutation({
    mutationFn: async (): Promise<GoogleLoginResponse> => {
      const response = await fetch(apiUrl("/auth/google/login"), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response.statusText || "Failed to start Google sign-in",
        );
      }

      return (await response.json()) as GoogleLoginResponse;
    },
  });
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body?.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}

export function useGoogleCallback() {
  return useMutation({
    mutationFn: async (code: string): Promise<TokenResponse> => {
      const query = new URLSearchParams({ code });
      const response = await fetch(
        apiUrl(`/auth/google/callback?${query.toString()}`),
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const detail = await readErrorDetail(response);
        throw new Error(
          detail ?? response.statusText ?? "Google sign-in failed",
        );
      }

      return (await response.json()) as TokenResponse;
    },
  });
}

export function useEnrollTotp() {
  return useMutation({
    mutationFn: () => apiPost<MfaEnrollResponse>("/auth/me/mfa/totp/enroll"),
  });
}

export function useMfaStatus() {
  return useQuery({
    queryKey: queryKeys.auth.mfaStatus(),
    queryFn: () => apiFetch<MfaStatusResponse>("/auth/me/mfa/status"),
    staleTime: 30_000,
  });
}

export function useVerifyTotp() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: MfaTotpVerifyRequest) =>
      apiPost<MfaRecoveryCodesResponse>("/auth/me/mfa/totp/verify", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

export function useMfaChallenge() {
  return useMutation({
    mutationFn: () => apiPost<MfaChallengeResponse>("/auth/me/mfa/challenge"),
  });
}

export function useVerifyMfa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: MfaVerifyRequest) => {
      const response = await authenticatedFetch("/auth/me/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await readErrorDetail(response);
        throw new Error(
          detail ?? response.statusText ?? "MFA verification failed",
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

export function useRegenerateRecoveryCodes() {
  return useMutation({
    mutationFn: () =>
      apiPost<MfaRecoveryCodesResponse>(
        "/auth/me/mfa/recovery-codes/regenerate",
      ),
  });
}

export function useDisableMfa() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: MfaDisableRequest) => {
      const response = await authenticatedFetch("/auth/me/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await readErrorDetail(response);
        throw new Error(
          detail ?? response.statusText ?? "Failed to disable two-factor",
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.mfaStatus() });
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UserProfileUpdate) =>
      apiPatch<User>("/users/me/profile", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

// Uploads the raw image bytes as the PUT body with the file's MIME type in the
// Content-Type header (the backend reads request.body(), no multipart wrapper).
export function useUploadAvatar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<User> => {
      const response = await authenticatedFetch("/users/me/avatar", {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        let detail = response.statusText;
        try {
          const payload: unknown = await response.json();
          if (
            payload &&
            typeof payload === "object" &&
            "detail" in payload &&
            typeof (payload as { detail: unknown }).detail === "string"
          ) {
            detail = (payload as { detail: string }).detail;
          }
        } catch {
          // keep statusText
        }
        throw new Error(detail);
      }
      return (await response.json()) as User;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

// --- External profile links (FR-2.8) --------------------------------------
// Every mutation invalidates BOTH the links list and `auth.me`: the same links
// are embedded in `me.profile.links`, so refreshing only one of the two leaves
// the profile page showing a stale set.

export function useMyProfileLinks() {
  return useQuery({
    queryKey: queryKeys.auth.profileLinks(),
    queryFn: () => apiFetch<UserProfileLink[]>("/users/me/links"),
  });
}

function useInvalidateProfileLinks() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.auth.profileLinks() });
    void qc.invalidateQueries({ queryKey: queryKeys.auth.me() });
  };
}

export function useCreateProfileLink() {
  const invalidate = useInvalidateProfileLinks();

  return useMutation({
    mutationFn: (body: UserProfileLinkIn) =>
      apiPost<UserProfileLink>("/users/me/links", body),
    onSuccess: invalidate,
  });
}

export function useUpdateProfileLink() {
  const invalidate = useInvalidateProfileLinks();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserProfileLinkUpdate }) =>
      apiPatch<UserProfileLink>(`/users/me/links/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteProfileLink() {
  const invalidate = useInvalidateProfileLinks();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/users/me/links/${id}`),
    onSuccess: invalidate,
  });
}
