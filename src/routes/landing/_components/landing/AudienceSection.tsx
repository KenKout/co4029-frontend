import { Building2, GraduationCap, Presentation, Check } from "lucide-react";
import { useLandingCopy } from "./use-landing-copy";

const audienceIcons = [Presentation, GraduationCap, Building2];

export default function AudienceSection() {
  const { c } = useLandingCopy();
  return (
    <section
      id="for-educators"
      aria-labelledby="audience-title"
      className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
        {c.audience.kicker}
      </p>
      <h2
        id="audience-title"
        className="mt-3 max-w-2xl font-headline text-3xl font-bold leading-tight tracking-tight text-text-strong sm:text-4xl"
      >
        {c.audience.title}
      </h2>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {c.audience.cards.map(
          ({ role, title, description, benefits }, index) => {
            const Icon = audienceIcons[index];
            return (
              <article
                key={role}
                className="rounded-2xl border border-border bg-background p-6 sm:p-7"
              >
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <p className="mt-5 text-xs font-semibold text-primary">
                  {role}
                </p>
                <h3 className="mt-2 font-headline text-xl font-bold leading-snug text-text-strong">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  {description}
                </p>
                <ul className="mt-6 space-y-3 border-t border-border pt-5">
                  {benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-sm text-text-body"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}
