import { UserEmailIdentity } from "@/components/ui/user-identity";
import type { RosterEntry } from "@/lib/api/types";

/**
 * Identity cell for the roster table. Previously a hand-rolled row that also
 * carried its own `ENROLLMENT_COLOR` map and re-derived the i18n locale
 * inline — both now come from the shared modules
 * (`lib/status-tokens`, `lib/format/date`).
 *
 * Renders the uploaded photo when the roster carries one (`avatar_url`,
 * presigned by the backend), so this table and the teacher Students page draw
 * the same student the same way.
 */
export function StudentIdentityCell({ entry }: { entry: RosterEntry }) {
  const name = entry.display_name || entry.primary_email;
  return (
    <UserEmailIdentity
      id={entry.student_id}
      displayName={name}
      avatarUrl={entry.avatar_url}
      email={entry.primary_email}
    />
  );
}
