import * as React from "react";
import { Mail } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Everything needed to draw one person. Deliberately shape-free: callers map
 * their API row (UserRead, RosterEntry, MembershipRead, flat roster row, …)
 * into these four primitives, so the component does not need a union of every
 * backend payload.
 */
export interface UserIdentityProps {
  /** Stable seed for the colour hash — the user id. */
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  /** Second line under the name — plain text or inline elements (Mail icon, copy button…). */
  subtitle?: React.ReactNode;
}

/**
 * The one person-block used across tables, cards and lists.
 *
 * History: the avatar + bold name + muted-email block was copy-pasted across
 * ~15 screens (admin users, memberships, audit, org-units members, course
 * rosters, teacher rosters, career-path students, management worklist …),
 * drifting in text sizes (`text-xs` vs `text-[11px]`), email icon presence,
 * and fallback treatment. This is the single implementation — fix drift here,
 * not at call sites.
 *
 * Rows that navigate wrap this in their own `<Link>`/onClick (see
 * career-path StudentsTab) — the component stays a plain display block.
 */
export function UserIdentity({
  id,
  displayName,
  avatarUrl,
  subtitle,
  size = "sm",
  className,
  subtitleClassName,
  children,
}: UserIdentityProps & {
  /** `sm` (28px, table rows) or `lg` (40px, detail headers). */
  size?: "sm" | "lg";
  className?: string;
  /** Tighten/loosen the second line without losing the shared layout. */
  subtitleClassName?: string;
  /** Extra content on the name line (badges/pills), after the name. */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <Avatar size={size} className={avatarColor(id)}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback>
          {avatarInitials(displayName, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-text-strong truncate">
            {displayName}
          </span>
          {children}
        </p>
        {subtitle ? (
          <p
            className={cn(
              "text-xs text-text-muted flex items-center gap-1.5 mt-0.5",
              subtitleClassName,
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Identity cell with the muted Mail-icon email line — the most common
 * subtitle in tables. Email is optional: callers without one on a row
 * (compact cards, unlinked rows) render name-only.
 */
export function UserEmailIdentity({
  id,
  displayName,
  avatarUrl,
  email,
  size,
  className,
  subtitleClassName,
  children,
}: UserIdentityProps & {
  email?: string | null;
  size?: "sm" | "lg";
  className?: string;
  subtitleClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <UserIdentity
      id={id}
      displayName={displayName}
      avatarUrl={avatarUrl}
      size={size}
      className={className}
      subtitleClassName={subtitleClassName}
      subtitle={
        email ? (
          <>
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{email}</span>
          </>
        ) : null
      }
    >
      {children}
    </UserIdentity>
  );
}
