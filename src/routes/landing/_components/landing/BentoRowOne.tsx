import { Building2, Route } from "lucide-react";

export function FacultyGovernanceTile() {
  return (
    <article className="reveal reveal-scale relative h-full w-full overflow-hidden rounded-xl shadow-editorial">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-7">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/15">
          <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
          Academic direction
        </p>
        <h3 className="mt-2 font-headline text-2xl font-bold text-white">
          Faculty Governance
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
          Sets academic standards, approves knowledge sources and reviews
          evidence across programs.
        </p>
      </div>
    </article>
  );
}

export function LearningProgramTile() {
  return (
    <article
      className="reveal reveal-scale relative h-full w-full overflow-hidden rounded-xl bg-m3-primary-fixed shadow-editorial"
      style={{ "--reveal-delay": "0.08s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-m3-primary-fixed to-m3-secondary-fixed/60" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-m3-primary">
          <Route className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-m3-primary/70">
          Coherent curriculum
        </p>
        <h3 className="mt-2 font-headline text-xl font-bold text-m3-on-surface">
          Learning Programs
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-m3-on-surface-variant">
          Organize outcomes and courses into a purposeful learning journey.
        </p>
      </div>
    </article>
  );
}
