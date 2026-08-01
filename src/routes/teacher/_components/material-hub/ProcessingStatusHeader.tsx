import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

import { materialIcon } from "./helpers";

/**
 * Icon + title + status badge + live percent of the processing card. Extracted
 * verbatim from the former 1422-line material-hub.tsx.
 */
export function ProcessingStatusHeader({
  material,
  proc,
  procKey,
  percent,
  inFlight,
}: {
  material: LearningMaterial;
  proc: { color: string; spin?: boolean };
  procKey: string;
  percent: number;
  inFlight: boolean;
}) {
  const { t } = useTranslation();
  const Icon = materialIcon(material.material_type);
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-m3-secondary-fixed flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-m3-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {material.title}
        </p>
        <Badge className={cn("text-[10px] border-0 mt-0.5", proc.color)}>
          {proc.spin && (
            <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline-block" />
          )}
          {t(`teacher_lesson_materials.proc_status.${procKey}`)}
        </Badge>
      </div>
      {inFlight && (
        <span className="text-sm font-bold text-m3-secondary tabular-nums shrink-0">
          {percent}%
        </span>
      )}
    </div>
  );
}
