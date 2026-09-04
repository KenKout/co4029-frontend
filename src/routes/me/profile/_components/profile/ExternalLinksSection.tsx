import { useTranslation } from "react-i18next";
import { Briefcase, Building2, Code2, Globe, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileLinkType } from "@/lib/api/types";
import type { ProfileView } from "./types";

// lucide-react dropped its brand glyphs (no `Github` / `Linkedin` export in
// this version), so these are the nearest generic stand-ins.
const LINK_ICONS: Record<ProfileLinkType, typeof Globe> = {
  website: Globe,
  github: Code2,
  linkedin: Building2,
  portfolio: Briefcase,
  other: Link2,
};

/**
 * Read-only external links (FR-2.8). Editing lives at `/settings/profile`;
 * this section only renders what the profile currently carries.
 */
export default function ExternalLinksSection({ view }: { view: ProfileView }) {
  const { t } = useTranslation();
  const { me, isLoading } = view;
  const links = me?.profile?.links ?? [];

  return (
    <section className="rounded-xl border border-m3-outline-variant/40 bg-white p-6">
      <h3 className="font-headline text-base font-bold text-text-strong">
        {t("profile.sections.links")}
      </h3>
      <div className="mt-2 divide-y divide-m3-outline-variant/30">
        {isLoading || !me ? (
          <div className="space-y-3 py-3">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
        ) : links.length === 0 ? (
          <p className="py-3 text-sm font-medium text-text-muted">
            {t("profile.empty.links")}
          </p>
        ) : (
          links.map((link) => {
            const Icon = LINK_ICONS[link.link_type as ProfileLinkType] ?? Link2;
            return (
              <div key={link.id} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    {link.label ||
                      t(`settings_profile.links.types.${link.link_type}`)}
                  </p>
                  {/* noopener/noreferrer: these URLs are user-supplied, so the
                      target must never get a handle on this window. */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block break-all text-sm font-medium text-m3-primary hover:underline"
                  >
                    {link.url}
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
