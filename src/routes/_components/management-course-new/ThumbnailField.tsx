import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { ImagePlus, X } from "lucide-react";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Cover image chosen during creation, uploaded after the course row exists.
 *
 * The upload endpoint is `PUT /courses/{id}/thumbnail`, so it genuinely cannot
 * run before the course is created — the file is held in memory here and sent
 * as step 2 of the submit sequence.
 *
 * Deliberately NOT persisted to the draft: a File cannot be JSON-serialised,
 * and stuffing several megabytes of base64 into localStorage is the fastest
 * way to blow the quota and take the whole draft down with it. A crash loses
 * the image selection only — every typed field survives. The restore banner
 * says so rather than letting the manager assume the image came back.
 */
export function ThumbnailField({
  file,
  onChange,
  t,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  t: TFunction;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Object URLs leak unless revoked; re-created whenever the file changes.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handlePick(picked: File | null) {
    setError(null);
    if (!picked) {
      onChange(null);
      return;
    }
    // Rejected here rather than at upload time: the upload is step 2 of the
    // submit, so a too-large file would otherwise fail AFTER the course was
    // already created.
    if (picked.size > MAX_BYTES) {
      setError(t("teacher_course_new.thumbnail_too_large"));
      return;
    }
    onChange(picked);
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-m3-on-surface">
        {t("teacher_course_new.thumbnail_heading")}
      </h2>

      {preview ? (
        <div className="relative w-full max-w-xs">
          <img
            src={preview}
            alt=""
            className="w-full aspect-video object-cover rounded-lg border border-m3-outline-variant/20"
          />
          <button
            type="button"
            onClick={() => handlePick(null)}
            aria-label={t("common.remove", { defaultValue: "Remove" })}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-m3-surface/90 flex items-center justify-center cursor-pointer hover:bg-m3-surface"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-xs aspect-video rounded-lg border border-dashed border-m3-outline-variant/40 flex flex-col items-center justify-center gap-2 text-xs text-m3-on-surface-variant hover:bg-surface-muted cursor-pointer"
        >
          <ImagePlus className="h-5 w-5" />
          {t("teacher_course_new.thumbnail_pick")}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
      />

      {error && <p className="text-xs text-m3-error">{error}</p>}
    </div>
  );
}
