import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "./types";
import type { User } from "@/lib/api/types";

export default function ProfileFormFields({
  me,
  errors,
}: {
  me: User | undefined;
  errors: FieldErrors;
}) {
  const { t } = useTranslation();
  return (
    <>
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
    </>
  );
}
