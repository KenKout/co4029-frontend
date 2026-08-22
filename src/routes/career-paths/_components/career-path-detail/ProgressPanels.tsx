import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  CareerPathCoursePublic,
  CareerPathProgressRead,
} from "@/lib/api/types";

export function CareerPathProgressCard({
  enrolled,
  progress,
  firstIncomplete,
}: {
  enrolled: boolean;
  progress: CareerPathProgressRead | undefined;
  firstIncomplete: CareerPathCoursePublic | undefined;
}) {
  const { t } = useTranslation();
  if (!enrolled || !progress) return null;
  return (
    <div className="rounded-xl bg-card ghost-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant font-bold">
            {t("career_path_detail.overall_progress")}
          </p>
          <p className="font-headline font-bold text-xl text-m3-on-surface">
            {Math.round(progress.overall_percent)}%
          </p>
        </div>
        {firstIncomplete && (
          <Link to="/courses/$slug" params={{ slug: firstIncomplete.slug }}>
            <Button size="sm" className="gap-2">
              {t("career_path_detail.continue_learning")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
      <div className="h-2 w-full bg-m3-surface-container rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-m3-primary to-m3-secondary transition-all"
          style={{
            width: `${Math.min(100, Math.max(0, progress.overall_percent))}%`,
          }}
        />
      </div>
    </div>
  );
}

export function CareerPathPreparedNotice({
  enrolled,
  progress,
}: {
  enrolled: boolean;
  progress: CareerPathProgressRead | undefined;
}) {
  const { t } = useTranslation();
  if (!enrolled || !progress || progress.overall_percent < 100) return null;
  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-emerald-900">
          {t("career_path_detail.prepared_title")}
        </p>
        <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
          {t("career_path_detail.prepared_body")}
        </p>
      </div>
    </div>
  );
}

export function CareerPathEnrollmentNotice({
  enrolled,
}: {
  enrolled: boolean;
}) {
  const { t } = useTranslation();
  if (enrolled) return null;
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
      <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">
          {t("career_path_detail.managed_enrollment_title")}
        </p>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          {t("career_path_detail.managed_enrollment_body")}
        </p>
      </div>
    </div>
  );
}
