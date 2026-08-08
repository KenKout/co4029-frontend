import { Mail } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
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
    <div className="flex items-center gap-3 min-w-0">
      <Avatar size="sm" className={avatarColor(entry.student_id)}>
        {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt={name} />}
        <AvatarFallback>
          {avatarInitials(name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {name}
        </p>
        <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{entry.primary_email}</span>
        </p>
      </div>
    </div>
  );
}
