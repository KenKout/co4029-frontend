import { BookOpenCheck, Signpost } from "lucide-react";

export function CareerPathTile() {
  return (
    <article
      className="reveal reveal-scale relative h-full w-full overflow-hidden rounded-xl shadow-editorial"
      style={{ "--reveal-delay": "0.16s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#004a57] to-[#00796b]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/15">
          <Signpost className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
          Capability progression
        </p>
        <h3 className="mt-2 font-headline text-xl font-bold text-white">
          Career Paths
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Translate target roles into transparent capability milestones.
        </p>
      </div>
    </article>
  );
}

export function CourseAssessmentTile() {
  return (
    <article
      className="reveal reveal-scale relative h-full w-full overflow-hidden rounded-xl shadow-editorial"
      style={{ "--reveal-delay": "0.24s" } as React.CSSProperties}
    >
      <div className="absolute inset-0 gradient-secondary" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-7">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/15">
          <BookOpenCheck className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
          Learning in action
        </p>
        <h3 className="mt-2 font-headline text-2xl font-bold text-white">
          Courses &amp; Assessment
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
          Connect instruction, practice and assessment to show what each learner
          can do next.
        </p>
      </div>
    </article>
  );
}
