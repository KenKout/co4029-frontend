import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Button } from "@/components/ui/button";

export default function ReadyCtaSection() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-xl gradient-primary p-8 flex flex-col gap-5 shadow-editorial">
      <div
        className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-2xl"
        style={{ background: "#1d4ed8" }}
      />

      <AIInsightChip className="self-start bg-white/15 text-white border-0">
        {t("dashboard.ai_chip")}
      </AIInsightChip>

      <div className="space-y-2">
        <h3 className="font-headline font-bold text-2xl text-white leading-snug">
          {t("dashboard.ready_title")}
        </h3>
        <p className="text-white/70 text-sm leading-relaxed max-w-lg">
          {t("dashboard.ready_body")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/courses">
          <Button className="bg-white text-m3-primary hover:bg-white/90 rounded-xl font-semibold gap-2 transition-colors">
            {t("dashboard.discover_courses")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/dashboard/sr">
          <Button
            variant="outline"
            className="bg-white/10 border-white/25 text-white hover:bg-white/20 rounded-xl font-semibold"
          >
            {t("dashboard.view_progress")}
          </Button>
        </Link>
      </div>
    </section>
  );
}
