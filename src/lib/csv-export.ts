/**
 * Minimal client-side CSV export. No dependency — builds a UTF-8 CSV blob
 * from an array of rows and triggers a browser download.
 *
 * Used by the admin AI-costs dashboard tables (by-category, by-model,
 * top-users, pipelines, recent calls) so cost-conscious admins can pull the
 * numbers into a spreadsheet without a backend export endpoint.
 */

export interface CsvColumn<T> {
  /** Header cell text. */
  header: string;
  /** Accessor returning the raw cell value for one row. */
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(raw: string | number | null | undefined): string {
  const s = raw === null || raw === undefined ? "" : String(raw);
  // Quote when the value contains a comma, quote, or newline; double inner quotes.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const csv = toCsv(rows, columns);
  // Prepend a BOM so Excel opens UTF-8 correctly.
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
