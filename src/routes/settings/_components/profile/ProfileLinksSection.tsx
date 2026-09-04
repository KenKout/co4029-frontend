import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileLinkType } from "@/lib/api/types";
import { MAX_PROFILE_LINKS, PROFILE_LINK_TYPES } from "./constants";
import type { ProfileLinksController } from "./use-profile-links";

/**
 * External-links editor (FR-2.8).
 *
 * Rendered OUTSIDE the profile `<form>`: it owns its own `<form>` for the add
 * row, and nesting forms is invalid HTML — a nested submit would post the
 * profile instead of the link.
 */
export default function ProfileLinksSection({
  links: controller,
}: {
  links: ProfileLinksController;
}) {
  const { t } = useTranslation();
  const {
    links,
    isLoading,
    isFull,
    linkType,
    setLinkType,
    urlError,
    labelError,
    isAdding,
    pendingRemovalId,
    handleAdd,
    handleRemove,
  } = controller;

  const typeOptions = PROFILE_LINK_TYPES.map((value) => ({
    value,
    label: t(`settings_profile.links.types.${value}`),
  }));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-headline text-base font-bold text-text-strong">
          {t("settings_profile.links.title")}
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          {t("settings_profile.links.hint", { max: MAX_PROFILE_LINKS })}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-text-muted">
          {t("settings_profile.links.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-m3-outline-variant/30 rounded-lg border border-m3-outline-variant/40">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-3 p-3">
              <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-text-muted">
                {t(`settings_profile.links.types.${link.link_type}`)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-text-strong">
                  {link.url}
                </p>
                {link.label ? (
                  <p className="text-xs text-text-muted">{link.label}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={t("settings_profile.links.remove")}
                disabled={pendingRemovalId === link.id}
                onClick={() => handleRemove(link.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select<ProfileLinkType>
            value={linkType}
            onValueChange={setLinkType}
            options={typeOptions}
            disabled={isFull || isAdding}
            aria-label={t("settings_profile.links.title")}
            className="sm:w-40"
          />
          <Input
            name="link_url"
            type="url"
            inputMode="url"
            maxLength={2048}
            disabled={isFull || isAdding}
            placeholder={t("settings_profile.links.url_placeholder")}
            aria-label={t("settings_profile.links.url_placeholder")}
            aria-invalid={urlError ? true : undefined}
            className="flex-1"
          />
          <Input
            name="link_label"
            maxLength={100}
            disabled={isFull || isAdding}
            placeholder={t("settings_profile.links.label_placeholder")}
            aria-label={t("settings_profile.links.label_placeholder")}
            aria-invalid={labelError ? true : undefined}
            className="sm:w-48"
          />
          <Button
            type="submit"
            disabled={isFull || isAdding}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {isAdding
              ? t("settings_profile.links.adding")
              : t("settings_profile.links.add")}
          </Button>
        </div>
        {urlError ? (
          <p className="text-sm text-destructive">{urlError}</p>
        ) : null}
        {labelError ? (
          <p className="text-sm text-destructive">{labelError}</p>
        ) : null}
        {isFull ? (
          <p className="text-sm text-text-muted">
            {t("settings_profile.links.full", { max: MAX_PROFILE_LINKS })}
          </p>
        ) : null}
      </form>
    </section>
  );
}
