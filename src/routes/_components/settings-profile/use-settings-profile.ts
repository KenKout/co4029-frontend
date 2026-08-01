import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useMe, useUpdateProfile, useUploadAvatar } from "@/lib/api/hooks/auth";
import { getAuthUserInitials } from "@/lib/auth";
import { useFileDrop } from "@/lib/use-file-drop";
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from "./constants";
import { readProfileForm, validateProfileForm } from "./helpers";
import type { FieldErrors, ProfileFormController } from "./types";

/**
 * Profile-edit controller: avatar upload (click + drag-and-drop), field
 * validation and the save mutation.
 *
 * Hook order matches the order the former inline `SettingsProfilePage` used
 * (useTranslation → useRouter → useNavigate → useMe → useUpdateProfile →
 * useUploadAvatar → useRef → useState → useFileDrop).
 */
export function useSettingsProfile(): ProfileFormController & {
  goBack: () => void;
} {
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fieldErrors = validateProfileForm(readProfileForm(formData), t);

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

  return {
    me,
    errors,
    setErrors,
    isSaving: updateProfile.isPending,
    handleSubmit,
    goBack,
    avatar: {
      avatarUrl,
      initials,
      isPending: uploadAvatar.isPending,
      dragging: avatarDragging,
      dropProps: avatarDropProps,
      fileInputRef,
      handleAvatarFile,
    },
  };
}
