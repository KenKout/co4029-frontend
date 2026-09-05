import { useState } from "react";
import { useMe } from "@/lib/api/hooks/auth";
import type {
  CourseSettingsInitialValues,
  CourseSettingsSetters,
  CourseSettingsValues,
} from "./types";

/**
 * The ten buffered settings fields, plus the panel's open flag and the
 * teacher account query that seeds the contact email.
 *
 * Extracted from the former 550-line `CourseSettingsPanel`. The `useState`
 * calls keep their original order — the five course-meta fields, then
 * `useMe()`, then the four contact fields — so the panel's hook slots are
 * unchanged.
 */
export function useCourseSettingsFields(defaultOpen = false) {
  // Collapsed by default on the teacher workspace, where this panel is one
  // of several and the modules are the point. The dept Settings tab passes
  // true: there the panel IS the page, and starting collapsed left the
  // screen showing two clickable rows and nothing else.
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  // Manager-only; the teacher surface never renders a control for it, so it
  // stays at its loaded value and the teacher payload omits it entirely.
  const [facultyId, setFacultyId] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
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
    facultyId,
    description,
    estimatedMinutes,
    contactEmail,
    contactPhone,
    contactWebsiteUrl,
    contactSocialUrl,
  };

  const setters: CourseSettingsSetters = {
    setTitle,
    setSlug,
    setFacultyId,
    setDescription,
    setEstimatedMinutes,
    setContactEmail,
    setContactPhone,
    setContactWebsiteUrl,
    setContactSocialUrl,
  };

  function applyInitial(init: CourseSettingsInitialValues) {
    setTitle(init.title);
    setSlug(init.slug);
    setDescription(init.description);
    setEstimatedMinutes(init.estimatedMinutes);
    setContactEmail(init.contactEmail);
    setContactPhone(init.contactPhone);
    setContactWebsiteUrl(init.contactWebsiteUrl);
    setContactSocialUrl(init.contactSocialUrl);
  }

  return { open, setOpen, me, values, setters, setContactEmail, applyInitial };
}
