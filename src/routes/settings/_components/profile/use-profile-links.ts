import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useCreateProfileLink,
  useDeleteProfileLink,
  useMyProfileLinks,
} from "@/lib/api/hooks/auth";
import type { ProfileLinkType, UserProfileLink } from "@/lib/api/types";
import { MAX_PROFILE_LINKS } from "./constants";

export interface ProfileLinksController {
  links: UserProfileLink[];
  isLoading: boolean;
  isFull: boolean;
  linkType: ProfileLinkType;
  setLinkType: (value: ProfileLinkType) => void;
  urlError: string | undefined;
  labelError: string | undefined;
  isAdding: boolean;
  pendingRemovalId: string | undefined;
  handleAdd: (e: FormEvent<HTMLFormElement>) => void;
  handleRemove: (id: string) => void;
}

/**
 * Controller for the external-links editor (FR-2.8).
 *
 * Links persist immediately on add/remove rather than on the profile form's
 * Save: they are their own collection endpoints, and batching them into the
 * PATCH would mean a half-finished row silently discarded when the user
 * navigates away. Client-side checks mirror the server's
 * (`UserProfileLinkIn`) so a bad URL is caught before the round trip; the
 * server stays the authority.
 */
export function useProfileLinks(): ProfileLinksController {
  const { t } = useTranslation();
  const { data: links, isLoading } = useMyProfileLinks();
  const createLink = useCreateProfileLink();
  const deleteLink = useDeleteProfileLink();

  const [linkType, setLinkType] = useState<ProfileLinkType>("website");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [labelError, setLabelError] = useState<string | undefined>();
  const [pendingRemovalId, setPendingRemovalId] = useState<
    string | undefined
  >();

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const url = ((formData.get("link_url") as string) ?? "").trim();
    const label = ((formData.get("link_label") as string) ?? "").trim();

    if (!url) {
      setUrlError(t("settings_profile.links.errors.url_required"));
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setUrlError(t("settings_profile.links.errors.url_scheme"));
      return;
    }
    if (label.length > 100) {
      setUrlError(undefined);
      setLabelError(t("settings_profile.links.errors.label_max"));
      return;
    }

    setUrlError(undefined);
    setLabelError(undefined);

    createLink.mutate(
      { link_type: linkType, url, label: label || null },
      {
        onSuccess: () => {
          toast.success(t("settings_profile.links.toasts.added"));
          form.reset();
          setLinkType("website");
        },
        onError: () =>
          toast.error(t("settings_profile.links.toasts.add_failed")),
      },
    );
  }

  function handleRemove(id: string) {
    setPendingRemovalId(id);
    deleteLink.mutate(id, {
      onSuccess: () =>
        toast.success(t("settings_profile.links.toasts.removed")),
      onError: () =>
        toast.error(t("settings_profile.links.toasts.remove_failed")),
      onSettled: () => setPendingRemovalId(undefined),
    });
  }

  return {
    links: links ?? [],
    isLoading,
    isFull: (links?.length ?? 0) >= MAX_PROFILE_LINKS,
    linkType,
    setLinkType,
    urlError,
    labelError,
    isAdding: createLink.isPending,
    pendingRemovalId,
    handleAdd,
    handleRemove,
  };
}
