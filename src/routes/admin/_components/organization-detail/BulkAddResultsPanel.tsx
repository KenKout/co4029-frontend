import type { BulkAddResults } from "./types";

/**
 * Outcome panel shown under the bulk-add textarea after a run: the added count
 * and, when any create call threw, the failing user ids.
 */
export function BulkAddResultsPanel({ results }: { results: BulkAddResults }) {
  return (
    <div className="rounded-lg border border-m3-outline-variant/40 p-3 space-y-2 text-sm">
      {results.ok.length > 0 && (
        <p className="text-emerald-700 font-semibold">
          ✓ Added {results.ok.length} member(s)
        </p>
      )}
      {results.failed.length > 0 && (
        <div>
          <p className="text-red-600 font-semibold">
            ✗ Failed {results.failed.length}:
          </p>
          <ul className="mt-1 space-y-0.5 text-xs font-mono text-text-muted">
            {results.failed.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
