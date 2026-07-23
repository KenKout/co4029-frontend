import type { MaterialUploadInitOut, MultipartPartsOut } from "../api/types";

export type UploadProgress = {
  bytesUploaded: number;
  totalBytes: number;
};

export type UploadedPart = { part_number: number; etag: string };

export type FetchPartsFn = (
  uploadId: string,
  from: number,
  count: number,
) => Promise<MultipartPartsOut>;

export type MultipartFetcher = typeof fetch;

export type MultipartUploadOpts = {
  fetchParts: FetchPartsFn;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
  fetcher?: MultipartFetcher;
  retryDelays?: number[];
  delay?: (ms: number) => Promise<void>;
};

export class MultipartUploadError extends Error {
  partNumber: number | null;
  cause?: unknown;

  constructor(
    message: string,
    partNumber: number | null = null,
    cause?: unknown,
  ) {
    super(message);
    this.name = "MultipartUploadError";
    this.partNumber = partNumber;
    this.cause = cause;
  }
}

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000];
const DEFAULT_CONCURRENCY = 3;

const defaultDelay = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

export function planParts(
  fileSize: number,
  partSize: number,
): Array<{ part_number: number; start: number; end: number }> {
  if (partSize <= 0) {
    throw new MultipartUploadError("part_size_bytes must be > 0");
  }
  if (fileSize <= 0) {
    throw new MultipartUploadError("file size must be > 0");
  }
  const out: Array<{ part_number: number; start: number; end: number }> = [];
  let cursor = 0;
  let n = 1;
  while (cursor < fileSize) {
    const end = Math.min(cursor + partSize, fileSize);
    out.push({ part_number: n, start: cursor, end });
    cursor = end;
    n += 1;
  }
  return out;
}

function extractEtag(headers: Headers): string | null {
  const raw = headers.get("ETag") ?? headers.get("etag");
  if (!raw) return null;
  return raw.replace(/^"|"$/g, "").replace(/^W\//, "");
}

export async function uploadPartWithRetry(
  url: string,
  body: Blob,
  partNumber: number,
  opts: {
    fetcher: MultipartFetcher;
    signal?: AbortSignal;
    retryDelays: number[];
    delay: (ms: number) => Promise<void>;
  },
): Promise<string> {
  const { fetcher, signal, retryDelays, delay } = opts;
  const maxAttempts = retryDelays.length + 1;

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new MultipartUploadError("Aborted by caller", partNumber);
    }
    try {
      const res = await fetcher(url, {
        method: "PUT",
        body,
        signal,
      });
      if (!res.ok) {
        lastErr = new MultipartUploadError(
          `S3 PUT failed: ${res.status} ${res.statusText}`,
          partNumber,
        );
      } else {
        const etag = extractEtag(res.headers);
        if (!etag) {
          throw new MultipartUploadError(
            "S3 PUT missing ETag (likely CORS exposure issue)",
            partNumber,
          );
        }
        return etag;
      }
    } catch (err) {
      if (
        err instanceof MultipartUploadError &&
        err.message.startsWith("S3 PUT missing ETag")
      ) {
        throw err;
      }
      lastErr = err;
      if (signal?.aborted) {
        throw new MultipartUploadError("Aborted by caller", partNumber, err);
      }
    }

    if (attempt < maxAttempts) {
      await delay(
        retryDelays[attempt - 1] ?? retryDelays[retryDelays.length - 1],
      );
    }
  }

  throw new MultipartUploadError(
    `Part ${partNumber} failed after ${maxAttempts} attempts`,
    partNumber,
    lastErr,
  );
}

export async function uploadMultipart(
  file: File,
  init: MaterialUploadInitOut,
  opts: MultipartUploadOpts,
): Promise<{ uploadId: string; parts: UploadedPart[] }> {
  if (init.mode !== "multipart") {
    throw new MultipartUploadError(
      "uploadMultipart called with mode != 'multipart'",
    );
  }
  if (!init.upload_id) {
    throw new MultipartUploadError("init.upload_id missing");
  }
  if (!init.part_size_bytes || init.part_size_bytes <= 0) {
    throw new MultipartUploadError("init.part_size_bytes missing or invalid");
  }

  const fetcher = opts.fetcher ?? fetch;
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  const retryDelays = opts.retryDelays ?? DEFAULT_RETRY_DELAYS;
  const delay = opts.delay ?? defaultDelay;

  const planned = planParts(file.size, init.part_size_bytes);
  const totalBytes = file.size;
  const partUrls = new Map<number, string>();

  if (init.parts && init.parts.length > 0) {
    for (const p of init.parts) partUrls.set(p.part_number, p.url);
  }

  let bytesUploaded = 0;
  const reportProgress = () => {
    opts.onProgress?.({ bytesUploaded, totalBytes });
  };

  async function ensureUrlFor(partNumber: number): Promise<string> {
    const cached = partUrls.get(partNumber);
    if (cached) return cached;
    const remaining = planned.length - partNumber + 1;
    const fetchCount = Math.min(Math.max(concurrency * 2, 5), remaining);
    const next = await opts.fetchParts(init.upload_id!, partNumber, fetchCount);
    for (const p of next.parts) partUrls.set(p.part_number, p.url);
    const url = partUrls.get(partNumber);
    if (!url) {
      throw new MultipartUploadError(
        `fetchParts did not return URL for part ${partNumber}`,
        partNumber,
      );
    }
    return url;
  }

  const completed: UploadedPart[] = [];
  let nextIndex = 0;

  async function worker() {
    while (true) {
      if (opts.signal?.aborted) {
        throw new MultipartUploadError("Aborted by caller");
      }
      const idx = nextIndex;
      nextIndex += 1;
      if (idx >= planned.length) return;
      const slice = planned[idx];
      const url = await ensureUrlFor(slice.part_number);
      const blob = file.slice(slice.start, slice.end);
      const etag = await uploadPartWithRetry(url, blob, slice.part_number, {
        fetcher,
        signal: opts.signal,
        retryDelays,
        delay,
      });
      completed.push({ part_number: slice.part_number, etag });
      bytesUploaded += slice.end - slice.start;
      reportProgress();
    }
  }

  reportProgress();
  const workers = Array.from(
    { length: Math.min(concurrency, planned.length) },
    () => worker(),
  );
  await Promise.all(workers);

  completed.sort((a, b) => a.part_number - b.part_number);
  return { uploadId: init.upload_id, parts: completed };
}
