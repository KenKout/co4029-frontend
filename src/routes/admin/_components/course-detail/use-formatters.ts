import { useTranslation } from "react-i18next";

import type { CourseDetailFormatters } from "./types";

export function useFormatters(): CourseDetailFormatters {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return {
    formatDate: (iso: string | null | undefined): string => {
      if (!iso) return "—";
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso));
    },
    formatNumber: (n: number | undefined | null): string => {
      if (n === undefined || n === null) return "—";
      return new Intl.NumberFormat(locale).format(n);
    },
    formatUsd: (n: number | undefined | null): string => {
      if (n === undefined || n === null) return "—";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(n);
    },
  };
}
