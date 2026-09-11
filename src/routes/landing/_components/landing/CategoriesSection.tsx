import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { AnimatedBentoRow } from "@/components/ui/animated-bento";
import { SectionHeader } from "@/components/ui/section-header";
import { FacultyGovernanceTile, LearningProgramTile } from "./BentoRowOne";
import { CareerPathTile, CourseAssessmentTile } from "./BentoRowTwo";
import { learningAudiences } from "./constants";

export default function CategoriesSection() {
  return (
    <section
      aria-labelledby="academic-model-title"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="reveal reveal-up mb-10 space-y-3">
        <AIInsightChip pulse={false}>Connected academic model</AIInsightChip>
        <SectionHeader
          id="academic-model-title"
          title="One learning system, from strategy to mastery"
          subtitle="Faculty direction flows through programs and career paths into courses, assessment evidence and continuous improvement."
        />
      </div>

      <div className="flex flex-col gap-4">
        <AnimatedBentoRow defaultFlex={[2, 1]}>
          <FacultyGovernanceTile />
          <LearningProgramTile />
        </AnimatedBentoRow>
        <AnimatedBentoRow defaultFlex={[1, 2]}>
          <CareerPathTile />
          <CourseAssessmentTile />
        </AnimatedBentoRow>
      </div>

      <div className="reveal reveal-up mt-12 border-t border-m3-outline-variant/30 pt-8">
        <h3 className="font-headline text-xl font-bold text-m3-on-surface">
          Designed for shared accountability
        </h3>
        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {learningAudiences.map(({ icon: Icon, role, value }) => (
            <li key={role} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-m3-surface-container-low text-m3-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-headline font-bold text-m3-on-surface">
                  {role}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-m3-on-surface-variant">
                  {value}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
