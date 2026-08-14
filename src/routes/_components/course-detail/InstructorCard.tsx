import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Globe, Mail, Phone, Share2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import type { CoursePublic, InstructorRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { deriveContactLinks, prettyUrl } from "./helpers";

const ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary/8 text-m3-primary group-hover:bg-m3-primary/15 transition-colors";

/** Avatar + name header (compact right-rail card). */
function InstructorHeader({ instructor }: { instructor: InstructorRead }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-12 w-12 shrink-0">
        {instructor.avatar_url ? (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        ) : null}
        <AvatarFallback className="gradient-primary text-white text-sm font-bold">
          {avatarInitials(instructor.display_name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-headline font-bold text-m3-on-surface truncate">
          {instructor.display_name}
        </p>
        <p className="text-xs text-m3-on-surface-variant">
          {t("course_detail.instructor_role")}
        </p>
      </div>
    </div>
  );
}

/**
 * Small inline copy affordance (Copy icon → green Check for ~1.2s), same
 * pattern as ConfigKeyReveal. Every contact row gets one.
 */
function CopyContactButton({
  value,
  ariaLabel,
}: {
  value: string;
  ariaLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={copy}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="shrink-0 p-1.5 rounded-lg text-m3-outline transition-colors hover:text-m3-primary hover:bg-m3-primary/8 cursor-pointer h-auto whitespace-normal"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

/**
 * Contact rows, one per line (single column), each with a copy button and
 * word-break so long emails/URLs wrap instead of overflowing the cell.
 * Sub-headed rather than given their own card, and only divided from the
 * header when both halves are present.
 */
function ContactList({
  course,
  hasHeader,
}: {
  course: CoursePublic;
  hasHeader: boolean;
}) {
  const { t } = useTranslation();
  const { email, phone, website, social } = deriveContactLinks(course);

  return (
    <div
      className={cn(
        hasHeader && "mt-5 pt-5 border-t border-m3-outline-variant/20",
      )}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-3">
        {t("course_detail.contact_title")}
      </h3>
      <div className="flex flex-col gap-3">
        {email && (
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={`mailto:${email}`}
              className="group flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors flex-1 min-w-0"
            >
              <span className={ICON_CLASS}>
                <Mail className="h-4 w-4" />
              </span>
              <span className="break-words min-w-0">{email}</span>
            </a>
            <CopyContactButton
              value={email}
              ariaLabel={t("course_detail.copy_email")}
            />
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="group flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors flex-1 min-w-0"
            >
              <span className={ICON_CLASS}>
                <Phone className="h-4 w-4" />
              </span>
              <span className="break-words min-w-0">{phone}</span>
            </a>
            <CopyContactButton
              value={phone}
              ariaLabel={t("course_detail.copy_phone")}
            />
          </div>
        )}
        {website && (
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors flex-1 min-w-0"
            >
              <span className={ICON_CLASS}>
                <Globe className="h-4 w-4" />
              </span>
              <span className="break-words min-w-0">{prettyUrl(website)}</span>
            </a>
            <CopyContactButton
              value={website}
              ariaLabel={t("course_detail.copy_website")}
            />
          </div>
        )}
        {social && (
          <div className="flex items-center gap-2 min-w-0">
            <a
              href={social}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors flex-1 min-w-0"
            >
              <span className={ICON_CLASS}>
                <Share2 className="h-4 w-4" />
              </span>
              <span className="break-words min-w-0">{prettyUrl(social)}</span>
            </a>
            <CopyContactButton
              value={social}
              ariaLabel={t("course_detail.copy_social")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "About the instructor" — compact right-rail card: avatar + name, then the
 * four contact infos in a single column, each with a copy button.
 *
 * Renders nothing when there is neither an instructor nor any contact field,
 * so a course with neither shows no empty card (preserving the old merged
 * card's empty-state behaviour, pinned by
 * `src/routes/__tests__/course-detail-instructor.test.tsx`).
 */
export function InstructorCard({ course }: { course: CoursePublic }) {
  const { t } = useTranslation();
  const instructor = course.instructor ?? null;
  const { hasContact } = deriveContactLinks(course);

  if (!instructor && !hasContact) return null;

  return (
    <GlassCard className="p-6">
      <h2 className="font-headline font-bold text-lg text-m3-on-surface mb-4">
        {t("course_detail.about_instructor")}
      </h2>

      {instructor && <InstructorHeader instructor={instructor} />}

      {hasContact && (
        <ContactList course={course} hasHeader={instructor != null} />
      )}
    </GlassCard>
  );
}
