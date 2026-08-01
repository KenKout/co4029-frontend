import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { resolveLocale } from "./helpers";

/**
 * Currency / number / datetime formatters for the AI-costs dashboard. USD is
 * always formatted in `en-US` (the billing currency), while counts and
 * timestamps follow the active UI locale.
 */
export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.resolvedLanguage, i18n.language);
  return useMemo(
    () => ({
      usd: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 4,
      }),
      number: new Intl.NumberFormat(locale),
      datetime: new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    }),
    [locale],
  );
}

export type Formatters = ReturnType<typeof useFormatters>;
