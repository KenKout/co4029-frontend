/**
 * Moved to `@/lib/hooks/useFullscreenDeterrent` — the ask-once / count-exits
 * policy is the same for a quiz take. Re-exported here so existing interview
 * call sites and their tests are unchanged.
 */
export {
  useFullscreenDeterrent,
  type FullscreenDeterrent,
} from "@/lib/hooks/useFullscreenDeterrent";
