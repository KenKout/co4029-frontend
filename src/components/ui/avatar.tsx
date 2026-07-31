import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";

import { cn } from "@/lib/utils";

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & { size?: "default" | "sm" | "lg" }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };

/**
 * Colour-coded initials fallback helpers, folded in from the copies that lived
 * in course-students, course-student-detail, course-detail, and
 * LessonDiscussionPanel.
 */

/**
 * First-letter-of-first-two-words initials. `uppercase` upper-cases the result
 * (course-detail / discussion variants did; the student-table variant relied on
 * a CSS `uppercase` class instead). `fallback` is returned when the name yields
 * no letters (the discussion panel used "?").
 */
export function avatarInitials(
  name: string | null | undefined,
  opts?: { uppercase?: boolean; fallback?: string },
): string {
  const parts = (name ?? "").trim().split(/\s+/);
  let out = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  if (opts?.uppercase) out = out.toUpperCase();
  return out || (opts?.fallback ?? "");
}

/** Deterministic avatar background+text colour, hashed from a stable seed
 *  (e.g. a user/student id) so the same person always gets the same colour. */
export const AVATAR_COLORS = [
  "bg-m3-primary-fixed text-m3-primary",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
