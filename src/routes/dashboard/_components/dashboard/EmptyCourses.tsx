import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function EmptyCourses({
  hasLearningPrograms,
}: {
  hasLearningPrograms: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="col-span-full">
      <EmptyState
        icon={BookOpen}
        title={t("dashboard.empty_courses_title")}
        description={t(
          hasLearningPrograms
            ? "dashboard.empty_courses_program_body"
            : "dashboard.empty_courses_body",
        )}
        cta={
          <Link to={hasLearningPrograms ? "/me/learning-programs" : "/courses"}>
            <Button variant="default" className="gap-2 font-semibold">
              {t(
                hasLearningPrograms
                  ? "dashboard.view_learning_plan"
                  : "dashboard.discover_courses",
              )}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />
    </div>
  );
}
