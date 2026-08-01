import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while GET /interview-sessions/{id} is in flight. */
export function ResultLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

/** Shown when the session cannot be read at all (404 / not the owner / 5xx). */
export function ResultLoadFailed() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl p-6">
      <GlassCard className="p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger" />
        <h2 className="font-headline text-lg font-bold text-m3-on-surface">
          {t("me_interview_result.load_failed_title")}
        </h2>
        <p className="mt-1 text-sm text-m3-on-surface-variant">
          {t("me_interview_result.load_failed_body")}
        </p>
        <Link to="/me/interviews" className="mt-4 inline-block">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            {t("me_interview_result.back_to_list")}
          </Button>
        </Link>
      </GlassCard>
    </div>
  );
}
