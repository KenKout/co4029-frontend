import { ArrowDown, Check, FileText, GitBranch } from "lucide-react";

export default function HeroVisual() {
  return (
    <figure className="relative min-w-0 rounded-2xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl sm:p-7">
      <figcaption className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <span className="text-sm font-semibold">
          One lesson. Connected learning.
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Illustrative example
        </span>
      </figcaption>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <span className="rounded-lg bg-blue-100 p-3 text-blue-800">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            01 / TEACHING MATERIAL
          </p>
          <p className="mt-1 font-semibold">Introduction to databases</p>
          <p className="mt-1 text-xs text-slate-600">
            Your lesson notes and learning outcomes
          </p>
        </div>
      </div>
      <ArrowDown
        className="mx-auto my-3 h-5 w-5 text-slate-400"
        aria-hidden="true"
      />
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-blue-800">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          02 / CONCEPTS FOR REVIEW
        </p>
        <ol className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium">
          {["Tables", "Keys", "Relationships"].map((concept) => (
            <li
              key={concept}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2"
            >
              {concept}
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-xs text-blue-800">
          <Check className="h-4 w-4" aria-hidden="true" />
          Instructor reviews before publication
        </p>
      </div>
      <ArrowDown
        className="mx-auto my-3 h-5 w-5 text-slate-400"
        aria-hidden="true"
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-900">
          03 / NEXT LEARNING STEP
        </p>
        <p className="mt-2 text-sm font-semibold">
          Revisit how foreign keys connect tables
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Use assessment evidence to guide the next practice activity.
        </p>
      </div>
    </figure>
  );
}
