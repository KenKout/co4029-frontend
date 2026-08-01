import type { User } from "@/lib/api/types";

/**
 * Shared types for the read-only profile page, extracted from `profile.tsx` so
 * the section components agree on one shape instead of taking a dozen scalars.
 */

/** The trimmed name/bio fields, plus the display name they fall back to. */
export interface ProfileNames {
  givenName: string;
  familyName: string;
  fullName: string;
  bio: string;
}

/** Everything a profile section needs: the query state plus derived labels. */
export interface ProfileView extends ProfileNames {
  me: User | undefined;
  isLoading: boolean;
  displayName: string;
  initials: string;
  formatDate: (iso: string | null | undefined) => string;
}
