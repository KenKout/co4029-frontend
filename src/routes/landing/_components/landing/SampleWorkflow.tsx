import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GitBranch,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLandingCopy } from "./use-landing-copy";

const stepIcons = [FileText, GitBranch, Target];

export default function SampleWorkflow() {
  const [active, setActive] = useState(0);
  const { c } = useLandingCopy();
  const step = c.workflow.steps[active];
  const Icon = stepIcons[active];
  return (
    <section
      id="how-it-works"
      aria-labelledby="workflow-title"
      className="scroll-mt-24 bg-m3-surface-container-low py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {c.workflow.kicker}
          </p>
          <h2
            id="workflow-title"
            className="mt-3 font-headline text-3xl font-bold leading-tight tracking-tight text-text-strong sm:text-4xl"
          >
            {c.workflow.title}
          </h2>
          <p className="mt-4 leading-relaxed text-text-muted">
            {c.workflow.body}
          </p>
        </div>
        <div
          id="sample-workflow"
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-background shadow-editorial"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-8">
            <h3 className="text-sm font-semibold text-text-strong">
              {c.workflow.explore}
            </h3>
            <p className="text-xs text-text-muted">{c.workflow.noAccount}</p>
          </div>
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="border-b border-border p-4 sm:p-6 lg:border-r lg:border-b-0">
              <div aria-label={c.workflow.stepsLabel} className="space-y-2">
                {c.workflow.steps.map(({ label }, index) => {
                  const StepIcon = stepIcons[index];
                  return (
                    <Button
                      variant="ghost"
                      key={label}
                      type="button"
                      aria-pressed={active === index}
                      aria-controls="sample-workflow-panel"
                      onClick={() => setActive(index)}
                      className={cn(
                        "flex h-auto w-full items-center justify-start gap-3 whitespace-normal rounded-xl border p-4 text-left transition-colors",
                        active === index
                          ? "border-primary/30 bg-m3-primary-fixed text-primary"
                          : "border-transparent text-text-muted hover:bg-muted",
                      )}
                    >
                      <span className="text-xs font-bold">0{index + 1}</span>
                      <StepIcon
                        className="h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm font-semibold">
                        {label}
                      </span>
                      {active === index && (
                        <ArrowRight
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                  );
                })}
              </div>
              <p className="px-4 pt-5 text-xs leading-relaxed text-text-muted">
                {c.workflow.disclaimer}
              </p>
            </div>
            <div
              id="sample-workflow-panel"
              role="region"
              aria-label={c.workflow.panel}
              aria-live="polite"
              aria-atomic="true"
              className="min-w-0 p-5 sm:p-8 lg:min-h-[370px]"
            >
              <p className="text-xs font-semibold text-primary">
                {c.workflow.step} 0{active + 1}
              </p>
              <h4 className="mt-2 font-headline text-xl font-bold text-text-strong sm:text-2xl">
                {step.title}
              </h4>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {step.description}
              </p>
              <div className="mt-6 rounded-xl border border-border bg-m3-surface-container-low p-5">
                <p className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-primary">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {step.eyebrow}
                </p>
                <p className="mt-3 font-semibold text-text-strong">
                  {step.detail}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-body">
                  {step.content}
                </p>
                <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm leading-relaxed text-primary">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {step.outcome}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
