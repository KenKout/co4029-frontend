import {
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Icon + colour per learning-material type.
 *
 * Covers every value the DB check constraint allows
 * (`learning_materials_material_type_check`): video, pdf, code, audio, image,
 * docx, pptx, xlsx, text. Anything unrecognised falls back to a generic file
 * icon rather than rendering nothing, so a new backend type degrades gracefully
 * instead of leaving a blank cell.
 *
 * Colours are per-family (documents warm, media cool, spreadsheets green) so a
 * long breakdown list is scannable at a glance.
 */
const MATERIAL_TYPE_ICONS: Record<
  string,
  { icon: LucideIcon; className: string }
> = {
  pdf: { icon: FileType, className: "text-red-600 bg-red-50" },
  docx: { icon: FileText, className: "text-blue-600 bg-blue-50" },
  text: { icon: FileText, className: "text-slate-600 bg-slate-100" },
  pptx: { icon: Presentation, className: "text-orange-600 bg-orange-50" },
  xlsx: { icon: FileSpreadsheet, className: "text-emerald-600 bg-emerald-50" },
  video: { icon: Video, className: "text-violet-600 bg-violet-50" },
  audio: { icon: FileAudio, className: "text-pink-600 bg-pink-50" },
  image: { icon: FileImage, className: "text-amber-600 bg-amber-50" },
  code: { icon: FileCode2, className: "text-cyan-700 bg-cyan-50" },
};

const FALLBACK = {
  icon: FileArchive,
  className: "text-slate-500 bg-slate-100",
};

export function materialTypeVisual(materialType: string) {
  return MATERIAL_TYPE_ICONS[materialType.toLowerCase()] ?? FALLBACK;
}

/**
 * Square icon chip for a material type.
 *
 * `aria-hidden` because it always accompanies the visible type label — a screen
 * reader announcing "pdf pdf" is worse than the label alone.
 */
export function MaterialTypeIcon({
  materialType,
  className,
}: {
  materialType: string;
  className?: string;
}) {
  const { icon: Icon, className: tone } = materialTypeVisual(materialType);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
        tone,
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default MaterialTypeIcon;
