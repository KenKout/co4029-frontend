import type { TFunction } from "i18next";
import type { RefObject } from "react";
import { toast } from "sonner";

import type {
  useAbortMultipartUpload,
  useCompleteMaterialUpload,
  useCompleteMultipartUpload,
  useFetchMultipartParts,
} from "@/lib/api/hooks/materials";
import type { MaterialUploadInitOut } from "@/lib/api/types";
import { uploadMultipart } from "@/lib/upload/multipart";

import { isLikelyCorsError, sha256Hex } from "./helpers";
import type { UploadPhase } from "./types";

/**
 * The two upload paths the backend's init response selects between — a single
 * PUT for small files, chunked multipart for large ones — extracted verbatim
 * from the former 1422-line material-hub.tsx.
 *
 * They stay closures over the mutations and the phase setters (exactly as they
 * were inside the form) so the FormData/payload fields, the progress callback,
 * the abort-on-failure cleanup and the CORS toast are unchanged; only their
 * declaration site moved.
 */
export interface UploadRunnerDeps {
  file: File;
  t: TFunction;
  setPhase: (phase: UploadPhase) => void;
  setProgress: (value: number) => void;
  abortRef: RefObject<AbortController | null>;
  completeUpload: ReturnType<typeof useCompleteMaterialUpload>;
  fetchParts: ReturnType<typeof useFetchMultipartParts>;
  completeMultipart: ReturnType<typeof useCompleteMultipartUpload>;
  abortMultipart: ReturnType<typeof useAbortMultipartUpload>;
}

export interface UploadRunners {
  runSingleUpload: (
    init: MaterialUploadInitOut,
    contentType: string,
  ) => Promise<void>;
  runMultipartUpload: (init: MaterialUploadInitOut) => Promise<void>;
}

export function createUploadRunners(deps: UploadRunnerDeps): UploadRunners {
  const {
    file,
    t,
    setPhase,
    setProgress,
    abortRef,
    completeUpload,
    fetchParts,
    completeMultipart,
    abortMultipart,
  } = deps;

  async function runSingleUpload(
    init: MaterialUploadInitOut,
    contentType: string,
  ) {
    if (!init.upload_url) {
      throw new Error(t("teacher_lesson_materials.errors.upload_url_missing"));
    }
    setPhase("hashing");
    const checksum = await sha256Hex(file);
    setPhase("uploading");
    setProgress(0);
    try {
      const res = await fetch(init.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!res.ok) {
        throw new Error(`S3 PUT failed: ${res.status}`);
      }
    } catch (err) {
      if (isLikelyCorsError(err)) {
        toast.error(t("teacher_lesson_materials.toasts.storage_not_ready"));
      }
      throw err;
    }
    setProgress(100);
    setPhase("completing");
    await completeUpload.mutateAsync({
      materialId: init.material_id,
      versionId: init.version_id,
      payload: {
        storage_object_id: init.storage_object_id,
        checksum_sha256: checksum,
      },
    });
  }

  async function runMultipartUpload(init: MaterialUploadInitOut) {
    setPhase("uploading");
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const result = await uploadMultipart(file, init, {
        signal: ac.signal,
        onProgress: ({ bytesUploaded, totalBytes }) => {
          setProgress(
            totalBytes === 0 ? 0 : (bytesUploaded / totalBytes) * 100,
          );
        },
        fetchParts: async (uploadId, from, count) => {
          const res = await fetchParts.mutateAsync({
            materialId: init.material_id,
            versionId: init.version_id,
            uploadId,
            from,
            count,
          });
          return res;
        },
      });
      setPhase("completing");
      await completeMultipart.mutateAsync({
        materialId: init.material_id,
        versionId: init.version_id,
        payload: {
          upload_id: result.uploadId,
          parts: result.parts,
        },
      });
    } catch (err) {
      if (init.upload_id) {
        try {
          await abortMultipart.mutateAsync({
            materialId: init.material_id,
            versionId: init.version_id,
            payload: { upload_id: init.upload_id },
          });
        } catch {
          /* swallow abort errors — primary error is more important */
        }
      }
      if (isLikelyCorsError(err)) {
        toast.error(t("teacher_lesson_materials.toasts.storage_not_ready"));
      }
      throw err;
    } finally {
      abortRef.current = null;
    }
  }

  return { runSingleUpload, runMultipartUpload };
}
