import { describe, expect, it, vi } from "vitest";
import {
  MultipartUploadError,
  planParts,
  uploadMultipart,
  uploadPartWithRetry,
} from "../multipart";
import type { MaterialUploadInitOut, MultipartPartsOut } from "../../api/types";

function makeFile(size: number) {
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i++) buf[i] = i & 0xff;
  return new File([buf], "fixture.bin", { type: "application/octet-stream" });
}

function makeResponse(opts: {
  ok?: boolean;
  status?: number;
  etag?: string | null;
}): Response {
  const headers = new Headers();
  if (opts.etag !== null && opts.etag !== undefined) {
    headers.set("ETag", opts.etag);
  }
  return new Response(null, {
    status: opts.status ?? (opts.ok === false ? 500 : 200),
    headers,
  });
}

describe("planParts", () => {
  it("slices an exact-multiple file into N equal parts", () => {
    const parts = planParts(30, 10);
    expect(parts).toEqual([
      { part_number: 1, start: 0, end: 10 },
      { part_number: 2, start: 10, end: 20 },
      { part_number: 3, start: 20, end: 30 },
    ]);
  });

  it("creates a smaller final part when file is not a multiple of partSize", () => {
    const parts = planParts(25, 10);
    expect(parts).toHaveLength(3);
    expect(parts[2]).toEqual({ part_number: 3, start: 20, end: 25 });
  });

  it("creates a single part when file fits in one partSize", () => {
    const parts = planParts(7, 10);
    expect(parts).toEqual([{ part_number: 1, start: 0, end: 7 }]);
  });

  it("rejects zero or negative partSize", () => {
    expect(() => planParts(10, 0)).toThrow(MultipartUploadError);
    expect(() => planParts(10, -1)).toThrow(MultipartUploadError);
  });

  it("rejects empty file", () => {
    expect(() => planParts(0, 10)).toThrow(MultipartUploadError);
  });
});

describe("uploadPartWithRetry", () => {
  it("returns the ETag (stripped of quotes) on first success", async () => {
    const fetcher = vi.fn(async () =>
      makeResponse({ etag: '"abc123"' }),
    ) as unknown as typeof fetch;

    const etag = await uploadPartWithRetry(
      "https://s3/part1",
      new Blob(["x"]),
      1,
      { fetcher, retryDelays: [1, 2, 4], delay: async () => {} },
    );

    expect(etag).toBe("abc123");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure and succeeds on the 3rd attempt", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async () => {
      calls.push("call");
      if (calls.length < 3) throw new Error("network down");
      return makeResponse({ etag: '"ok"' });
    }) as unknown as typeof fetch;

    const delay = vi.fn(async () => {});
    const etag = await uploadPartWithRetry("https://s3/p", new Blob(["x"]), 1, {
      fetcher,
      retryDelays: [1, 2, 4],
      delay,
    });

    expect(etag).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledWith(1);
    expect(delay).toHaveBeenCalledWith(2);
  });

  it("throws after exhausting all retry attempts", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(
      uploadPartWithRetry("https://s3/p", new Blob(["x"]), 7, {
        fetcher,
        retryDelays: [1, 2, 4],
        delay: async () => {},
      }),
    ).rejects.toMatchObject({ partNumber: 7, name: "MultipartUploadError" });

    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("fails immediately when ETag header is missing (CORS exposure issue)", async () => {
    const fetcher = vi.fn(async () =>
      makeResponse({ etag: null }),
    ) as unknown as typeof fetch;

    await expect(
      uploadPartWithRetry("https://s3/p", new Blob(["x"]), 1, {
        fetcher,
        retryDelays: [1, 2, 4],
        delay: async () => {},
      }),
    ).rejects.toThrow(/missing ETag/);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("aborts on signal", async () => {
    const ac = new AbortController();
    ac.abort();
    const fetcher = vi.fn() as unknown as typeof fetch;

    await expect(
      uploadPartWithRetry("https://s3/p", new Blob(["x"]), 1, {
        fetcher,
        signal: ac.signal,
        retryDelays: [1],
        delay: async () => {},
      }),
    ).rejects.toThrow(/Aborted/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("uploadMultipart", () => {
  it("uploads all parts and reports progress", async () => {
    const file = makeFile(25);
    const init: MaterialUploadInitOut = {
      material_id: "m1",
      version_id: "v1",
      storage_object_id: "s1",
      mode: "multipart",
      expires_at: "2099-01-01",
      upload_id: "upl-1",
      part_size_bytes: 10,
      part_count: 3,
      parts: [
        { part_number: 1, url: "https://s3/p1" },
        { part_number: 2, url: "https://s3/p2" },
        { part_number: 3, url: "https://s3/p3" },
      ],
    };

    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      const num = u.endsWith("p1") ? 1 : u.endsWith("p2") ? 2 : 3;
      return makeResponse({ etag: `"etag-${num}"` });
    }) as unknown as typeof fetch;

    const progressEvents: number[] = [];
    const result = await uploadMultipart(file, init, {
      fetcher,
      fetchParts: async () => ({ parts: [], expires_at: "" }),
      onProgress: (p) => progressEvents.push(p.bytesUploaded),
      retryDelays: [1, 2, 4],
      delay: async () => {},
      concurrency: 2,
    });

    expect(result.uploadId).toBe("upl-1");
    expect(result.parts).toHaveLength(3);
    expect(result.parts.map((p) => p.part_number)).toEqual([1, 2, 3]);
    expect(result.parts.find((p) => p.part_number === 2)?.etag).toBe("etag-2");
    expect(progressEvents[progressEvents.length - 1]).toBe(25);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("calls fetchParts when init does not provide all part URLs upfront", async () => {
    const file = makeFile(20);
    const init: MaterialUploadInitOut = {
      material_id: "m1",
      version_id: "v1",
      storage_object_id: "s1",
      mode: "multipart",
      expires_at: "2099-01-01",
      upload_id: "upl-2",
      part_size_bytes: 10,
      part_count: 2,
      parts: null,
    };

    const fetchParts = vi.fn(
      async (uploadId: string, from: number): Promise<MultipartPartsOut> => {
        expect(uploadId).toBe("upl-2");
        expect(from).toBe(1);
        return {
          parts: [
            { part_number: 1, url: "https://s3/p1" },
            { part_number: 2, url: "https://s3/p2" },
          ],
          expires_at: "2099-01-01",
        };
      },
    );

    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      return makeResponse({ etag: u.endsWith("p1") ? '"a"' : '"b"' });
    }) as unknown as typeof fetch;

    const result = await uploadMultipart(file, init, {
      fetcher,
      fetchParts,
      retryDelays: [1, 2, 4],
      delay: async () => {},
      concurrency: 1,
    });

    expect(fetchParts).toHaveBeenCalledTimes(1);
    expect(result.parts).toHaveLength(2);
    expect(result.parts[0].etag).toBe("a");
    expect(result.parts[1].etag).toBe("b");
  });

  it("aborts mid-upload when signal fires", async () => {
    const file = makeFile(30);
    const init: MaterialUploadInitOut = {
      material_id: "m1",
      version_id: "v1",
      storage_object_id: "s1",
      mode: "multipart",
      expires_at: "2099-01-01",
      upload_id: "upl-3",
      part_size_bytes: 10,
      part_count: 3,
      parts: [
        { part_number: 1, url: "https://s3/p1" },
        { part_number: 2, url: "https://s3/p2" },
        { part_number: 3, url: "https://s3/p3" },
      ],
    };

    const ac = new AbortController();
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls += 1;
      if (calls === 1) ac.abort();
      return makeResponse({ etag: '"x"' });
    }) as unknown as typeof fetch;

    await expect(
      uploadMultipart(file, init, {
        fetcher,
        fetchParts: async () => ({ parts: [], expires_at: "" }),
        signal: ac.signal,
        retryDelays: [1, 2, 4],
        delay: async () => {},
        concurrency: 1,
      }),
    ).rejects.toThrow(/Aborted/);
  });

  it("throws when called with mode='single'", async () => {
    const init: MaterialUploadInitOut = {
      material_id: "m1",
      version_id: "v1",
      storage_object_id: "s1",
      mode: "single",
      expires_at: "2099-01-01",
      upload_url: "https://s3/single",
    };
    await expect(
      uploadMultipart(makeFile(10), init, {
        fetcher: fetch,
        fetchParts: async () => ({ parts: [], expires_at: "" }),
      }),
    ).rejects.toThrow(/multipart/);
  });
});
