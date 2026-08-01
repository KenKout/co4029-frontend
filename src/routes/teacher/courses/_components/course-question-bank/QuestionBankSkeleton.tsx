import type { CSSProperties } from "react";

/**
 * Loading placeholder for the bank list, extracted verbatim from the former
 * 843-line course-question-bank.tsx.
 */
export function QuestionBankSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-[86px] animate-pulse rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low"
          style={{ animationDelay: `${i * 120}ms` } as CSSProperties}
        />
      ))}
    </ul>
  );
}
