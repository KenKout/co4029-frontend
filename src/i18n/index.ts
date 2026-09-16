import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next, useTranslation } from "react-i18next";

import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "abridgeai.locale";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      vi: { common: vi },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

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

export default i18n;
