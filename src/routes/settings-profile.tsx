import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useMe, useUpdateProfile, useUploadAvatar } from "@/lib/api/hooks/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { getAuthUserInitials } from "@/lib/auth";
import { useFileDrop } from "@/lib/use-file-drop";
import { cn } from "@/lib/utils";

// Client-side guardrails mirroring the backend (JPEG/PNG/WebP/GIF, ≤ 2 MiB) so
// obviously-bad files are rejected before the upload round-trip.
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

interface FieldErrors {
  display_name?: string;
  given_name?: string;
  family_name?: string;
  bio?: string;
}

export default function SettingsProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const avatarUrl = me?.profile?.avatar_url ?? undefined;
  const initials = getAuthUserInitials(me ?? null);

  function uploadAvatarFile(file: File) {
    if (!file) return;
    if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
      toast.error(t("settings_profile.avatar.invalid_type"));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t("settings_profile.avatar.too_large"));
      return;
    }
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success(t("settings_profile.avatar.updated")),
      onError: (err) =>
        toast.error(
          (err as Error).message || t("settings_profile.avatar.upload_failed"),
        ),
    });
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file fires onChange again.
    e.target.value = "";
    if (file) uploadAvatarFile(file);
  }

  // Drag-and-drop onto the avatar tile — same flicker-proof lifecycle as
  // every other upload surface; keeps the live image preview.
  const { dragging: avatarDragging, dropProps: avatarDropProps } = useFileDrop({
    onFile: uploadAvatarFile,
    disabled: uploadAvatar.isPending,
  });

  // Go back to previous page if available, fall back to settings hub.
  // Direct deep-links / refreshes have no useful history entry, so the
  // fallback prevents a no-op back button.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/settings" });
    }
  }

  function validate(form: FormData): FieldErrors | null {
    const errs: FieldErrors = {};
    const displayName = (form.get("display_name") as string)?.trim() ?? "";
    const givenName = (form.get("given_name") as string)?.trim() ?? "";
    const familyName = (form.get("family_name") as string)?.trim() ?? "";
    const bio = (form.get("bio") as string)?.trim() ?? "";

    if (!displayName || displayName.length < 1) {
      errs.display_name = t("settings_profile.errors.display_name_required");
    } else if (displayName.length > 100) {
      errs.display_name = t("settings_profile.errors.display_name_max");
    }

    if (givenName.length > 100) {
      errs.given_name = t("settings_profile.errors.given_name_max");
    }

    if (familyName.length > 100) {
      errs.family_name = t("settings_profile.errors.family_name_max");
    }

    if (bio.length > 1000) {
      errs.bio = t("settings_profile.errors.bio_max");
    }

    return Object.keys(errs).length > 0 ? errs : null;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fieldErrors = validate(formData);

    if (fieldErrors) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    updateProfile.mutate(
      {
        display_name: (formData.get("display_name") as string).trim() || null,
        given_name: (formData.get("given_name") as string).trim() || null,
        family_name: (formData.get("family_name") as string).trim() || null,
        bio: (formData.get("bio") as string).trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(t("settings_profile.toasts.saved"));
          // Return to the page the user came from once the save lands.
          goBack();
        },
        onError: () => {
          toast.error(t("settings_profile.toasts.save_failed"));
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader
        title={t("settings_profile.title")}
        subtitle={t("settings_profile.subtitle")}
        onBack={goBack}
      />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Avatar upload — click the image (or the button) to pick a new
                one; it uploads immediately and the presigned URL refreshes. */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                {...avatarDropProps}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                aria-label={t("settings_profile.avatar.change")}
                className={cn(
                  "group relative rounded-full transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
                  avatarDragging &&
                    "ring-2 ring-m3-secondary ring-offset-2 shadow-ai-glow",
                )}
              >
                <Avatar size="lg" className="size-16">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                  <AvatarFallback className="text-lg">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                {/* Hover/upload overlay */}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {uploadAvatar.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <div className="min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadAvatar.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  {uploadAvatar.isPending ? (
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

            <Field
              id="display_name"
              label={t("settings_profile.fields.display_name")}
              required
              error={errors.display_name}
              renderControl={(p) => (
                <Input
                  {...p}
                  name="display_name"
                  required
                  minLength={1}
                  maxLength={100}
                  defaultValue={me?.profile?.display_name ?? ""}
                />
              )}
            />

            <Field
              id="given_name"
              label={t("settings_profile.fields.given_name")}
              error={errors.given_name}
              renderControl={(p) => (
                <Input
                  {...p}
                  name="given_name"
                  maxLength={100}
                  defaultValue={me?.profile?.given_name ?? ""}
                />
              )}
            />

            <Field
              id="family_name"
              label={t("settings_profile.fields.family_name")}
              error={errors.family_name}
              renderControl={(p) => (
                <Input
                  {...p}
                  name="family_name"
                  maxLength={100}
                  defaultValue={me?.profile?.family_name ?? ""}
                />
              )}
            />

            <Field
              id="bio"
              label={t("settings_profile.fields.bio")}
              error={errors.bio}
              renderControl={(p) => (
                <textarea
                  {...p}
                  name="bio"
                  maxLength={1000}
                  rows={4}
                  defaultValue={me?.profile?.bio ?? ""}
                  className={cn(
                    "w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 resize-y",
                  )}
                />
              )}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="size-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {t("settings_profile.saving")}
                  </span>
                ) : (
                  t("settings_profile.save")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
