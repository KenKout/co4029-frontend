// Test-only synchronous i18n setup, aliased in for "@/i18n" by
// vitest.config.ts. The production module loads locale catalogs through an
// async i18next backend (see ./index.ts); tests import i18n and render
// against it immediately, so they need the old behaviour: both catalogs
// bundled and init resolved synchronously. Export surface must stay
// identical to ./index.ts.
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import vi from "./locales/vi.json";

export {
  SUPPORTED_LOCALES,
  resolveSupportedLocale,
  useContentLanguage,
} from "./shared";
export type { SupportedLocale } from "./shared";

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
    supportedLngs: ["en", "vi"],
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
