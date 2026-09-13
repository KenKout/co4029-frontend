import { useRef, useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useObjectUrl } from "@/lib/use-object-url";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function CareerPathThumbnailField({
  currentUrl,
  file,
  onChange,
  disabled = false,
  compact = false,
}: {
  currentUrl?: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const stagedUrl = useObjectUrl(file);
  const preview = stagedUrl ?? currentUrl;

  function select(fileToUse: File | null) {
    if (!fileToUse) return;
    setError(null);
    if (!ACCEPT.split(",").includes(fileToUse.type)) {
      setError(t("management_career_path_detail.thumbnail.invalid_type"));
      return;
    }
    if (fileToUse.size > MAX_BYTES) {
      setError(t("management_career_path_detail.thumbnail.too_large"));
      return;
    }
    onChange(fileToUse);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("management_career_path_detail.thumbnail.label")}
      </label>
      <div className={cn("flex gap-4", compact ? "items-start" : "items-center")}>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label={t("management_career_path_detail.thumbnail.change")}
          className="group relative aspect-video w-40 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-m3-outline-variant/30 p-0 h-auto"
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 via-blue-700 to-blue-800">
              <ImageIcon className="h-7 w-7 text-white/70" />
            </div>
          )}
          {!disabled ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </span>
          ) : null}
        </Button>
        {!disabled ? (
          <div className="min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              {t("management_career_path_detail.thumbnail.change")}
            </Button>
            <p className="mt-1 text-xs text-m3-on-surface-variant">
              {t("management_career_path_detail.thumbnail.hint")}
            </p>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            select(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>
      {error ? <p className="text-xs text-m3-error">{error}</p> : null}
    </div>
  );
}
