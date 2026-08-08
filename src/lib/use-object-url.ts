import { useEffect, useState } from "react";

/**
 * A blob URL for a picked File, revoked when it changes or unmounts.
 *
 * Shared rather than duplicated: both the picker and the card preview show the
 * same chosen image, and calling `createObjectURL` in each of them would mint
 * two URLs for one file — twice the retained blob, and two revoke lifecycles
 * to keep in step. One hook, one URL, passed to both.
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    // Without this the blob is retained for the lifetime of the document —
    // picking a few images in one session would pin all of them in memory.
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}
