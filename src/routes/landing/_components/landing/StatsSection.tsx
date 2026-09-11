import { learningPrinciples } from "./constants";

export default function StatsSection() {
  return (
    <section
      aria-labelledby="learning-principles-title"
      className="border-y border-m3-outline-variant/20 bg-m3-surface-container-lowest"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="learning-principles-title" className="sr-only">
          Learning design principles
        </h2>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {learningPrinciples.map(
            ({ icon: Icon, title, description }, index) => (
              <li
                key={title}
                className="reveal reveal-up flex items-start gap-4"
                style={
                  {
                    "--reveal-delay": `${index * 0.08}s`,
                  } as React.CSSProperties
                }
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-m3-primary-fixed text-m3-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-headline font-bold text-m3-on-surface">
                    {title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-m3-on-surface-variant">
                    {description}
                  </span>
                </span>
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
