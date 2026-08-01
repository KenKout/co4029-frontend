import { cn } from "@/lib/utils";

/** Twelve decorative level bars; pulse only while the mic is live. */
export function VoiceWaveform({ micActive }: { micActive: boolean }) {
  return (
    <div
      className="flex h-8 items-center justify-center gap-1"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-1 rounded-full bg-primary/70",
            micActive && "motion-safe:animate-pulse",
            bar % 3 === 0 ? "h-7" : bar % 2 === 0 ? "h-4" : "h-5",
          )}
          style={{ animationDelay: `${bar * 70}ms` }}
        />
      ))}
    </div>
  );
}
