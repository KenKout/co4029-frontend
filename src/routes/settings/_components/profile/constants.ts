// Client-side guardrails mirroring the backend (JPEG/PNG/WebP/GIF, ≤ 2 MiB) so
// obviously-bad files are rejected before the upload round-trip.
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

// Mirrors `MAX_PROFILE_LINKS` in the backend profile service (FR-2.8). Used to
// disable the add form once the profile is full; the server still enforces it.
export const MAX_PROFILE_LINKS = 10;

// Mirrors the `ProfileLinkType` Literal / the table's CHECK constraint.
export const PROFILE_LINK_TYPES = [
  "website",
  "github",
  "linkedin",
  "portfolio",
  "other",
] as const;
