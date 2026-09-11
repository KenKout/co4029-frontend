import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { SectionHeader } from "@/components/ui/section-header";
import { learningWorkflow } from "./constants";

export default function FeaturedCoursesSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="workflow-title"
      className="scroll-mt-24 bg-m3-surface-container-low py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal reveal-up mb-12 space-y-3">
          <AIInsightChip pulse={false}>How aBridgeAI works</AIInsightChip>
          <SectionHeader
            id="workflow-title"
            title="From trusted materials to learning evidence"
            subtitle="AI accelerates the work. Educators remain responsible for academic intent, review and publication."
          />
        </div>

        <ol className="grid gap-4 md:grid-cols-5">
          {learningWorkflow.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="reveal reveal-up relative rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-5 shadow-editorial"
              style={
                { "--reveal-delay": `${index * 0.08}s` } as React.CSSProperties
              }
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-fixed text-m3-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-headline text-sm font-bold text-m3-primary/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-headline text-lg font-bold text-m3-on-surface">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-m3-on-surface-variant">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
