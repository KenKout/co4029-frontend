import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import type { User } from "@/lib/api/types";
import type { FileDropHandlers } from "@/lib/use-file-drop";

/**
 * Shared types for the profile-edit form, extracted from `settings-profile.tsx`
 * so the form reader, the validator and the presentational pieces agree on one
 * shape.
 */

export interface FieldErrors {
  display_name?: string;
  given_name?: string;
  family_name?: string;
  bio?: string;
}

/** The four editable fields, already trimmed, as read out of the FormData. */
export interface ProfileFormValues {
  displayName: string;
  givenName: string;
  familyName: string;
  bio: string;
}

/** The avatar tile's upload state and its drag-and-drop wiring. */
export interface AvatarController {
  avatarUrl: string | undefined;
  initials: string;
  isPending: boolean;
  dragging: boolean;
  dropProps: FileDropHandlers;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Everything the profile-edit form needs from the page shell. */
export interface ProfileFormController {
  me: User | undefined;
  errors: FieldErrors;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
  isSaving: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  avatar: AvatarController;
}
