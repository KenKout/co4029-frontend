import { useTranslation } from "react-i18next";

export function PageHeading() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-headline font-bold text-text-strong">
        {t("admin.stats.title_overview")}
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {t("admin.dashboard.subtitle")}
      </p>
    </div>
  );
}
