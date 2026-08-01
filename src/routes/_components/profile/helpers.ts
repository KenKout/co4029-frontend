import type { User } from "@/lib/api/types";
import type { ProfileNames } from "./types";

export function deriveProfileNames(me: User | undefined): ProfileNames {
  const givenName = me?.profile?.given_name?.trim() ?? "";
  const familyName = me?.profile?.family_name?.trim() ?? "";
  const fullName = [givenName, familyName].filter(Boolean).join(" ");
  const bio = me?.profile?.bio?.trim() ?? "";
  return { givenName, familyName, fullName, bio };
}
