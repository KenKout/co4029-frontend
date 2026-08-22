// Client-side guardrails mirroring the backend (JPEG/PNG/WebP/GIF, ≤ 2 MiB) so
// obviously-bad files are rejected before the upload round-trip.
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
