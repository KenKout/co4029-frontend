import { useTranslation } from "react-i18next";
import { Globe, Mail, Phone, Share2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import type { CoursePublic, InstructorRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { deriveContactLinks, prettyUrl } from "./helpers";

const ROW_CLASS =
  "flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors group";
const ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary/8 text-m3-primary group-hover:bg-m3-primary/15 transition-colors";

/** Avatar, name, role and headline. */
function InstructorBio({ instructor }: { instructor: InstructorRead }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row gap-5">
      <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white shadow-xl self-start">
        {instructor.avatar_url ? (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        ) : null}
        <AvatarFallback className="gradient-primary text-white text-xl font-bold">
          {avatarInitials(instructor.display_name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-3 flex-1">
        <div>
          <h3 className="font-headline font-bold text-m3-primary text-lg">
            {instructor.display_name}
          </h3>
          <p className="text-m3-secondary text-sm font-semibold mt-0.5">
            {t("course_detail.instructor_role")}
          </p>
        </div>
        {instructor.headline && (
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            {instructor.headline}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Contact rows. Sub-headed rather than given their own card, and only
 * divided from the bio when both halves are present.
 */
function ContactRows({
  course,
  hasBio,
}: {
  course: CoursePublic;
  hasBio: boolean;
}) {
  const { t } = useTranslation();
  const { email, phone, website, social } = deriveContactLinks(course);

  return (
    <div
      className={cn(
        hasBio && "mt-6 pt-6 border-t border-m3-outline-variant/20",
      )}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant mb-3">
        {t("course_detail.contact_title")}
      </h3>
      <div className="space-y-3">
        {email && (
          <a href={`mailto:${email}`} className={ROW_CLASS}>
            <span className={ICON_CLASS}>
              <Mail className="h-4 w-4" />
            </span>
            <span className="truncate">{email}</span>
          </a>
        )}
        {phone && (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className={ROW_CLASS}>
            <span className={ICON_CLASS}>
              <Phone className="h-4 w-4" />
            </span>
            <span className="truncate">{phone}</span>
          </a>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className={ROW_CLASS}
          >
            <span className={ICON_CLASS}>
              <Globe className="h-4 w-4" />
            </span>
            <span className="truncate">{prettyUrl(website)}</span>
          </a>
        )}
        {social && (
          <a
            href={social}
            target="_blank"
            rel="noopener noreferrer"
            className={ROW_CLASS}
          >
            <span className={ICON_CLASS}>
              <Share2 className="h-4 w-4" />
            </span>
            <span className="truncate">{prettyUrl(social)}</span>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Instructor bio AND their contact details in one card.
 *
 * These were two adjacent GlassCards ("About the instructor" + "Contact the
 * instructor") describing the same person, which read as duplicated headers with
 * an arbitrary split. Merged so the avatar/name/headline sit above the contact
 * rows in a single section.
 *
 * Renders nothing when there is neither an instructor nor any contact field, so
 * a course with neither shows no empty card (preserving ContactCard's old
 * behaviour).
 */
export function InstructorCard({ course }: { course: CoursePublic }) {
  const { t } = useTranslation();
  const instructor = course.instructor ?? null;
  const { hasContact } = deriveContactLinks(course);

  if (!instructor && !hasContact) return null;

  return (
    <GlassCard className="p-6 sm:p-8">
      <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-5">
        {t("course_detail.about_instructor")}
      </h2>

      {instructor && <InstructorBio instructor={instructor} />}

      {hasContact && (
        <ContactRows course={course} hasBio={instructor != null} />
      )}
    </GlassCard>
  );
}
