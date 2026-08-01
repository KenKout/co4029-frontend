import { useTranslation } from "react-i18next";
import { AudioLines, Check, ChevronDown, Headphones } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Audio input picker that sits beside the Voice/Type toggle. */
export function AudioInputMenu({ micAvailable }: { micAvailable: boolean }) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!micAvailable}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t("course_interview.workspace.audio_input")}
      >
        <Headphones className="h-4 w-4" />
        <span className="hidden sm:inline">
          {t("course_interview.workspace.system_microphone")}
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="gap-2 px-3 py-2">
          <AudioLines className="h-4 w-4" />
          {t("course_interview.workspace.system_microphone")}
          <Check className="ml-auto h-4 w-4 text-primary" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
