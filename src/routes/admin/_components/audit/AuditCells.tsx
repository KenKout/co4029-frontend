import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Mail, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useUsersByIds } from "@/lib/api/hooks/admin";

export type AuditUser = NonNullable<
  ReturnType<typeof useUsersByIds>["data"]
>[number];

/** Shared user-identity cell: avatar + display name + email + copy UUID. */
export function UserIdentityCell({
  userId,
  users,
  systemLabel,
}: {
  userId: string | null | undefined;
  users: AuditUser[] | undefined;
  systemLabel: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!userId) {
    return (
      <span className="text-m3-on-surface-variant italic">{systemLabel}</span>
    );
  }

  const user = users?.find((u) => u.id === userId);
  const displayName = user?.profile?.display_name?.trim() || userId;

  const copyId = () => {
    void navigator.clipboard.writeText(userId).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => toast.error(t("admin.audit.copy_failed")),
    );
  };

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar size="sm" className={avatarColor(userId)}>
        {user?.profile?.avatar_url && (
          <AvatarImage src={user.profile.avatar_url} alt={displayName} />
        )}
        <AvatarFallback>
          {avatarInitials(displayName, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {displayName}
        </p>
        {user ? (
          <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.primary_email}</span>
          </p>
        ) : (
          <p className="text-xs font-mono text-text-muted flex items-center gap-1 mt-0.5">
            <span className="truncate">{userId}</span>
            <Tooltip
              content={
                copied ? t("admin.audit.copied") : t("admin.audit.copy_id")
              }
            >
              <Button
                type="button"
                variant="ghost"
                aria-label={t("admin.audit.copy_id")}
                onClick={copyId}
                className="h-4 w-4 shrink-0 rounded p-0 hover:bg-transparent text-m3-on-surface-variant"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </Tooltip>
          </p>
        )}
      </div>
    </div>
  );
}

export function ErrorPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
      <ScrollText className="h-8 w-8 mx-auto mb-3 text-m3-error" />
      <p className="text-sm text-m3-error">{text}</p>
    </div>
  );
}
