import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useLandingCopy } from "./use-landing-copy";

export default function LandingFaq() {
  const { c } = useLandingCopy();
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto grid max-w-7xl scroll-mt-24 gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {c.faq.kicker}
        </p>
        <h2
          id="faq-title"
          className="mt-3 font-headline text-3xl font-bold tracking-tight text-text-strong sm:text-4xl"
        >
          {c.faq.title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          {c.faq.body}
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {c.faq.items.map((item) => (
          <details key={item.question} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold text-text-strong [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus
                className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-5 pr-6 text-sm leading-relaxed text-text-muted">
              {item.answerBefore}{" "}
              {"link" in item && item.link === "catalog" && (
                <Link
                  to="/courses"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {c.faq.catalog}
                </Link>
              )}
              {"link" in item && item.link === "help" && (
                <Link
                  to="/help"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {c.faq.help}
                </Link>
              )}{" "}
              {"answerAfter" in item ? item.answerAfter : ""}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
