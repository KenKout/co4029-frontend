import { useTranslation } from "react-i18next";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function CareerPathLoadingState() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 w-48 bg-m3-surface-container animate-pulse rounded-lg" />
      <div className="h-32 bg-m3-surface-container animate-pulse rounded-xl" />
      <PageSkeleton rows={3} height="h-20" gap="space-y-2" />
    </div>
  );
}

export function CareerPathErrorState() {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
        <p className="text-m3-on-error-container text-sm font-semibold">
          {t("career_path_detail.load_failed")}
        </p>
      </div>
    </div>
  );
}
