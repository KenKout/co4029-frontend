import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfileFooterActions() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
      <Link to="/settings">
        <Button variant="ghost" size="sm">
          {t("profile.go_to_settings")}
        </Button>
      </Link>
      <Link to="/settings/profile">
        <Button size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          {t("profile.edit")}
        </Button>
      </Link>
    </div>
  );
}
