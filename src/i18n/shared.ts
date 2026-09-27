import { useTranslation } from "react-i18next";

export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * The active language as a bare, SUPPORTED code — "en" or "vi".
 *
 * Distinct from `resolveLocale` in `lib/format/date`, which answers a
 * different question: that one maps to a BCP-47 locale for `Intl`
 * ("vi-VN"), this one to the language code our own API stores documents
 * under. Sending "vi-VN" where the server expects "vi" finds nothing.
 *
 * Detection can yield a region variant ("en-US") or something we do not
 * ship at all, so the subtag is stripped and the result checked against
 * SUPPORTED_LOCALES rather than cast.
 */
export function resolveSupportedLocale(
  language: string | undefined,
): SupportedLocale {
  const base = (language ?? "en").split("-")[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(base as SupportedLocale)
    ? (base as SupportedLocale)
    : "en";
}

/** `resolveSupportedLocale` bound to the active language, for components. */
export function useContentLanguage(): SupportedLocale {
  const { i18n: instance } = useTranslation();
  return resolveSupportedLocale(instance.resolvedLanguage ?? instance.language);
}
