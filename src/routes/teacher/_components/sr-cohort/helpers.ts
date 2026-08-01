// Relative-date formatter reuses the at-risk page's date i18n keys
// (teacher_sr_at_risk.*, the useRelDate defaults) since they already exist in
// both locales.
export function efMeta(meanEf: number) {
  if (meanEf < 1.6) {
    return {
      cls: "bg-red-100 text-red-700 border-red-200",
      labelKey: "teacher_sr_cohort.difficulty.hard",
    };
  }
  if (meanEf < 2.0) {
    return {
      cls: "bg-amber-100 text-amber-700 border-amber-200",
      labelKey: "teacher_sr_cohort.difficulty.medium",
    };
  }
  return {
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    labelKey: "teacher_sr_cohort.difficulty.easier",
  };
}
