import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

/**
 * Status / type / AI / visibility badge row of a material card. Extracted
 * verbatim from the former 1422-line material-hub.tsx.
 */
export function MaterialCardBadges({
  material,
  proc,
  procKey,
}: {
  material: LearningMaterial;
  proc: { color: string; spin?: boolean };
  procKey: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <Badge className={cn("text-[10px] border-0", proc.color)}>
        {proc.spin && (
          <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline-block" />
        )}
        {t(`teacher_lesson_materials.proc_status.${procKey}`)}
      </Badge>
      <span className="text-[11px] text-m3-on-surface-variant capitalize">
        {material.material_type}
      </span>
      {material.ai_processing_enabled && (
        <Badge className="text-[10px] border-0 bg-m3-secondary-fixed text-m3-on-secondary-fixed gap-1">
          <Sparkles className="h-2.5 w-2.5" /> AI
        </Badge>
      )}
      {material.visible_to_students ? (
        <Badge className="text-[10px] border-0 bg-emerald-50 text-emerald-700 gap-1">
          <Eye className="h-2.5 w-2.5" />{" "}
          {t("teacher_lesson_materials.badge.visible")}
        </Badge>
      ) : (
        <Badge className="text-[10px] border-0 bg-slate-100 text-slate-500 gap-1">
          <EyeOff className="h-2.5 w-2.5" />{" "}
          {t("teacher_lesson_materials.badge.hidden")}
        </Badge>
      )}
    </div>
  );
}
