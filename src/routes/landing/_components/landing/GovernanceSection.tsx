import {
  CheckCircle2,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { useLandingCopy } from "./use-landing-copy";

const safeguardIcons = [CheckCircle2, FileSearch, LockKeyhole];

export default function GovernanceSection() {
  const { c } = useLandingCopy();
  return (
    <section
      aria-labelledby="responsible-ai-title"
      className="relative overflow-hidden bg-[#172554] py-14 sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-[#1d4ed8]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-[#1e3a8a]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-5">
          <AIInsightChip pulse={false}>{c.governance.kicker}</AIInsightChip>
          <h2
            id="responsible-ai-title"
            className="font-headline text-3xl font-extrabold leading-tight text-white sm:text-4xl"
          >
            {c.governance.title}
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-white/70">
            {c.governance.body}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5 shadow-glass backdrop-blur-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck
                className="h-6 w-6 text-[#bfdbfe]"
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="font-headline font-bold text-white">
                {c.governance.heading}
              </p>
              <p className="text-sm text-white/55">{c.governance.subheading}</p>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {c.governance.safeguards.map(({ title, description }, index) => {
              const Icon = safeguardIcons[index];
              return (
                <li key={title} className="rounded-xl bg-white/[0.05] p-4">
                  <Icon className="h-5 w-5 text-[#bfdbfe]" aria-hidden="true" />
                  <h3 className="mt-4 font-headline font-bold text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
