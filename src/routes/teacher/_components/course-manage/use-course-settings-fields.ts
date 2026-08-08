import { useState } from "react";
import { useMe } from "@/lib/api/hooks/auth";
import type {
  CourseSettingsInitialValues,
  CourseSettingsSetters,
  CourseSettingsValues,
} from "./types";

/**
 * The eleven buffered settings fields, plus the panel's open flag and the
 * teacher account query that seeds the contact email.
 *
 * Extracted from the former 550-line `CourseSettingsPanel`. The `useState`
 * calls keep their original order — the seven course-meta fields, then
 * `useMe()`, then the four contact fields — so the panel's hook slots are
 * unchanged.
 */
export function useCourseSettingsFields() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [enrollmentCap, setEnrollmentCap] = useState("");
  const [completionDays, setCompletionDays] = useState("");
  // Teacher contact info shown on the student landing page. contactEmail is
  // pre-filled from the teacher's account email (useMe) on first load when the
  // course has none saved yet — but stays fully editable (a teacher may want a
  // different public address than their login).
  const { data: me } = useMe();
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWebsiteUrl, setContactWebsiteUrl] = useState("");
  const [contactSocialUrl, setContactSocialUrl] = useState("");

  const values: CourseSettingsValues = {
    title,
    slug,
    description,
    level,
    estimatedMinutes,
    enrollmentCap,
    completionDays,
    contactEmail,
    contactPhone,
    contactWebsiteUrl,
    contactSocialUrl,
  };

  const setters: CourseSettingsSetters = {
    setTitle,
    setSlug,
    setDescription,
    setLevel,
    setEstimatedMinutes,
    setEnrollmentCap,
    setCompletionDays,
    setContactEmail,
    setContactPhone,
    setContactWebsiteUrl,
    setContactSocialUrl,
  };

  function applyInitial(init: CourseSettingsInitialValues) {
    setTitle(init.title);
    setSlug(init.slug);
    setDescription(init.description);
    setLevel(init.level);
    setEstimatedMinutes(init.estimatedMinutes);
    setEnrollmentCap(init.enrollmentCap);
    setCompletionDays(init.completionDays);
    setContactEmail(init.contactEmail);
    setContactPhone(init.contactPhone);
    setContactWebsiteUrl(init.contactWebsiteUrl);
    setContactSocialUrl(init.contactSocialUrl);
  }

  return { open, setOpen, me, values, setters, setContactEmail, applyInitial };
}
