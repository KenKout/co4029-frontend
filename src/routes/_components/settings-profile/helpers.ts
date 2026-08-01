import type { TFunction } from "i18next";
import type { FieldErrors, ProfileFormValues } from "./types";

/**
 * Read the four editable fields out of the submitted FormData, trimmed.
 *
 * Split out of the former single `validate` so the eight short-circuits this
 * costs (`?.` plus `??` per field) no longer stack onto the branch checks
 * below — together they scored a complexity of 16.
 */
export function readProfileForm(form: FormData): ProfileFormValues {
  return {
    displayName: (form.get("display_name") as string)?.trim() ?? "",
    givenName: (form.get("given_name") as string)?.trim() ?? "",
    familyName: (form.get("family_name") as string)?.trim() ?? "",
    bio: (form.get("bio") as string)?.trim() ?? "",
  };
}

export function validateProfileForm(
  values: ProfileFormValues,
  t: TFunction,
): FieldErrors | null {
  const errs: FieldErrors = {};
  const { displayName, givenName, familyName, bio } = values;

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
