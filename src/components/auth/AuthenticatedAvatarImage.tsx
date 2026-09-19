import { useRef } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/AuthProvider";

interface AuthenticatedAvatarImageProps {
  alt?: string;
  className?: string;
}

/**
 * The API returns a short-lived signed avatar URL. If an avatar mounts after a
 * long idle period, refresh the user once so the image can retry with a newly
 * signed URL. The initials fallback remains visible while that happens.
 */
export function AuthenticatedAvatarImage({
  alt = "",
  className,
}: AuthenticatedAvatarImageProps) {
  const { user, refreshUser } = useAuth();
  const hasRetried = useRef(false);
  const avatarUrl = user?.profile?.avatar_url?.trim();

  if (!avatarUrl) return null;

  return (
    <AvatarImage
      key={avatarUrl}
      src={avatarUrl}
      alt={alt}
      className={className}
      onLoadingStatusChange={(status) => {
        if (status !== "error" || hasRetried.current) return;
        hasRetried.current = true;
        void refreshUser();
      }}
    />
  );
}
