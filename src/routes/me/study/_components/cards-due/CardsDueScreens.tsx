import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Nothing is due — the caught-up state. */
export function CardsDueEmptyState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Inbox}
      title={t("study_cards_due.empty_title", "Nothing due right now")}
      description={t(
        "study_cards_due.empty_body",
        "Your reviews are all caught up. New cards appear here when they're due.",
      )}
      cta={
        <Link to="/me/study">
          <Button variant="default" className="cursor-pointer">
            {t("study_cards_due.back_to_dashboard", "Back to dashboard")}
          </Button>
        </Link>
      }
    />
  );
}
