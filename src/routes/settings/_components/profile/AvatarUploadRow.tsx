import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AVATAR_ACCEPT } from "./constants";
import type { AvatarController } from "./types";

/**
 * Avatar upload — click the image (or the button) to pick a new one; it uploads
 * immediately and the presigned URL refreshes.
 */
export default function AvatarUploadRow({
  avatar,
}: {
  avatar: AvatarController;
}) {
  const { t } = useTranslation();
  const {
    avatarUrl,
    initials,
    isPending,
    dragging,
    dropProps,
    fileInputRef,
    handleAvatarFile,
  } = avatar;

  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost"
        type="button"
        {...dropProps}
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        aria-label={t("settings_profile.avatar.change")}
        className={cn(
          "group relative rounded-full transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
          dragging && "ring-2 ring-m3-secondary ring-offset-2 shadow-ai-glow",
        )}
      >
        <Avatar size="lg" className="size-16">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials || "?"}</AvatarFallback>
        </Avatar>
        {/* Hover/upload overlay */}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </span>
      </Button>
      <div className="min-w-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {t("settings_profile.avatar.change")}
        </Button>
        <p className="mt-1 text-xs text-m3-on-surface-variant">
          {t("settings_profile.avatar.hint")}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={handleAvatarFile}
        className="hidden"
      />
    </div>
  );
}
