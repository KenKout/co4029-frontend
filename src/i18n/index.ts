import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { SUPPORTED_LOCALES, resolveSupportedLocale } from "./shared";

export {
  SUPPORTED_LOCALES,
  resolveSupportedLocale,
  useContentLanguage,
} from "./shared";
export type { SupportedLocale } from "./shared";

const STORAGE_KEY = "abridgeai.locale";

/**
 * Backend that lazy-loads a locale catalog only when that language is
 * actually active. Bundling en.json + vi.json (652 kB raw) into the entry
 * chunk meant every visitor downloaded and parsed a translation file they
 * never render; with the backend each catalog becomes its own chunk and
 * i18next fetches it through read() on init AND on changeLanguage — so
 * AuthProvider's profile locale, the LanguageSwitcher and the interview
 * language flows all get the catalog loaded transparently before the
 * switch, without any call site needing to know.
 */
const lazyLocaleBackend = {
  type: "backend" as const,
  init() {},
  read(
    language: string,
    _namespace: string,
    callback: (err: unknown, data: unknown) => void,
  ) {
    const locale = resolveSupportedLocale(language);
    import(`./locales/${locale}.json`)
      .then((catalog) => callback(null, catalog.default))
      .catch((err: unknown) => callback(err, null));
  },
};

/**
 * Resolves once the active locale's catalog is loaded and i18next is ready
 * to translate. main.tsx gates the first render on this promise so no
 * component ever mounts against un-loaded resources. It never rejects: if
 * the catalog fetch fails the app still renders (raw keys) rather than a
 * white screen.
 *
 * fallbackLng is deliberately false here: with a backend, i18next loads the
 * whole fallback chain, which would silently reintroduce the both-locales
 * download this module exists to avoid. `npm run i18n:check` keeps the
 * catalogs complete, so a missing fallback is not a real failure mode.
 */
export const i18nReady: Promise<void> = i18n
  .use(lazyLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    fallbackLng: false,
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  })
  .then(() => undefined)
  .catch(() => undefined);

export default i18n;
