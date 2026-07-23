import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMe, useUpdateProfile } from "@/lib/api/hooks/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [errors, setErrors] = useState<FieldErrors>({});

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
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goBack}
          aria-label={t("settings_profile.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-m3-on-surface-variant">
          {t("settings_profile.back")}
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings_profile.title")}</CardTitle>
          <CardDescription>{t("settings_profile.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="display_name"
                className="text-sm font-medium text-foreground"
              >
                {t("settings_profile.fields.display_name")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                id="display_name"
                name="display_name"
                required
                minLength={1}
                maxLength={100}
                defaultValue={me?.profile?.display_name ?? ""}
                aria-invalid={!!errors.display_name}
                aria-describedby={
                  errors.display_name ? "err-display_name" : undefined
                }
              />
              {errors.display_name && (
                <p id="err-display_name" className="text-sm text-destructive">
                  {errors.display_name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="given_name"
                className="text-sm font-medium text-foreground"
              >
                {t("settings_profile.fields.given_name")}
              </label>
              <Input
                id="given_name"
                name="given_name"
                maxLength={100}
                defaultValue={me?.profile?.given_name ?? ""}
                aria-invalid={!!errors.given_name}
                aria-describedby={
                  errors.given_name ? "err-given_name" : undefined
                }
              />
              {errors.given_name && (
                <p id="err-given_name" className="text-sm text-destructive">
                  {errors.given_name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="family_name"
                className="text-sm font-medium text-foreground"
              >
                {t("settings_profile.fields.family_name")}
              </label>
              <Input
                id="family_name"
                name="family_name"
                maxLength={100}
                defaultValue={me?.profile?.family_name ?? ""}
                aria-invalid={!!errors.family_name}
                aria-describedby={
                  errors.family_name ? "err-family_name" : undefined
                }
              />
              {errors.family_name && (
                <p id="err-family_name" className="text-sm text-destructive">
                  {errors.family_name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bio"
                className="text-sm font-medium text-foreground"
              >
                {t("settings_profile.fields.bio")}
              </label>
              <textarea
                id="bio"
                name="bio"
                maxLength={1000}
                rows={4}
                defaultValue={me?.profile?.bio ?? ""}
                aria-invalid={!!errors.bio}
                aria-describedby={errors.bio ? "err-bio" : undefined}
                className={cn(
                  "w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 resize-y",
                )}
              />
              {errors.bio && (
                <p id="err-bio" className="text-sm text-destructive">
                  {errors.bio}
                </p>
              )}
            </div>

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
