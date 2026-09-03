import { DateRangePicker } from "@/routes/admin/_components/stats/DateRangePicker";
import type { AiCostsRange } from "@/lib/api/hooks/admin-costs";

/**
 * The AI-costs window control: the same calendar range picker the admin
 * dashboard and audit pages use (it replaced the 24h/7d/30d preset pills, so
 * this page is windowed like the rest of the admin section). ``AiCostsRange``
 * is structurally the dashboard's ``RangeSelection``, so the picker accepts it
 * unchanged.
 */
export function CostDateRange({
  value,
  onChange,
}: {
  value: AiCostsRange;
  onChange: (next: AiCostsRange) => void;
}) {
  return <DateRangePicker range={value} onChange={onChange} />;
}
