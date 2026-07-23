import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Construction } from "lucide-react";

export function ComingSoonPage({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-16 h-16 rounded-xl bg-m3-primary-fixed flex items-center justify-center mx-auto">
          <Construction className="h-8 w-8 text-m3-primary" />
        </div>
        <h1 className="font-headline font-bold text-2xl text-m3-on-surface">
          {title}
        </h1>
        <p className="text-m3-on-surface-variant text-sm">
          {t("placeholder.body")}
        </p>
        <Link to="/dashboard">
          <Button className="gradient-primary text-white border-0 gap-2 font-semibold">
            {t("placeholder.back")} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function PageWithKey({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return <ComingSoonPage title={t(titleKey)} />;
}

export function ProgressPage() {
  return <PageWithKey titleKey="placeholder.progress" />;
}

export function SettingsPage() {
  return <PageWithKey titleKey="placeholder.settings" />;
}

export function QuizPage() {
  return <PageWithKey titleKey="placeholder.quiz" />;
}

export function InterviewPage() {
  return <PageWithKey titleKey="placeholder.interview" />;
}
