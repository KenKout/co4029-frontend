/** The identity fields shared by UserRead and the stored auth user. */
export interface UserIdentity {
  primary_email?: string | null;
  profile?: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function getUserDisplayName(
  user: UserIdentity | null | undefined,
  fallback = "—",
): string {
  return user?.profile?.display_name?.trim() || user?.primary_email || fallback;
}

export function getUserAvatarUrl(
  user: UserIdentity | null | undefined,
): string | null {
  return user?.profile?.avatar_url?.trim() || null;
}
