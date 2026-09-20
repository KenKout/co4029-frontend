import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when the course has modules but no publishable lesson content yet. */
export function NoLessonsNotice({ slug }: { slug: string }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-m3-on-surface font-headline font-bold text-xl">
          {t("course_learn.no_lessons_title")}
        </p>
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_learn.no_lessons_body")}
        </p>
        <Link to="/courses/$slug" params={{ slug }}>
          <Button className="gradient-primary text-white rounded-xl gap-2">
            {t("course_learn.back_to_course")}{" "}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
