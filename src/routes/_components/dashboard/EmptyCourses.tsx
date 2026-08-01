import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function EmptyCourses() {
  const { t } = useTranslation();
  return (
    <div className="col-span-full">
      <EmptyState
        icon={BookOpen}
        title={t("dashboard.empty_courses_title")}
        description={t("dashboard.empty_courses_body")}
        cta={
          <Link to="/courses">
            <Button variant="default" className="gap-2 font-semibold">
              {t("dashboard.discover_courses")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
    </div>
  );
}
