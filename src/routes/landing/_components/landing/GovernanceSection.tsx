import {
  CheckCircle2,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";

const safeguards = [
  {
    icon: CheckCircle2,
    title: "Human approval",
    description:
      "Instructors review AI-proposed concepts and learning content.",
  },
  {
    icon: FileSearch,
    title: "Traceable alignment",
    description: "Learning evidence stays connected to outcomes and sources.",
  },
  {
    icon: LockKeyhole,
    title: "Scoped access",
    description:
      "Roles and institutional boundaries shape what people can access.",
  },
];

export default function GovernanceSection() {
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
          <AIInsightChip pulse={false}>Responsible AI by design</AIInsightChip>
          <h2
            id="responsible-ai-title"
            className="font-headline text-3xl font-extrabold leading-tight text-white sm:text-4xl"
          >
            AI supports academic judgment. It does not replace it.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-white/70">
            aBridgeAI helps educators structure knowledge, identify learning
            gaps and act on evidence while keeping academic decisions with the
            people accountable for student outcomes.
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
                Academic governance
              </p>
              <p className="text-sm text-white/55">
                Built into the learning workflow
              </p>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {safeguards.map(({ icon: Icon, title, description }) => (
              <li key={title} className="rounded-xl bg-white/[0.05] p-4">
                <Icon className="h-5 w-5 text-[#bfdbfe]" aria-hidden="true" />
                <h3 className="mt-4 font-headline font-bold text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
