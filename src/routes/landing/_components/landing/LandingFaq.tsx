import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export default function LandingFaq() {
  const questions = [
    {
      question: "Can I explore before signing in?",
      answer: (
        <>
          Yes. The sample workflow on this page is available without an account.
          To{" "}
          <Link
            to="/courses"
            className="font-medium text-primary underline underline-offset-4"
          >
            browse the course catalog
          </Link>
          , you will be asked to sign in. Learning activities also depend on
          your enrollment and permissions.
        </>
      ),
    },
    {
      question: "Who reviews what AI creates?",
      answer: (
        <>
          Instructors review AI-proposed concepts and learning content before
          publication. AI helps structure the material; academic review stays
          with educators.
        </>
      ),
    },
    {
      question: "Is the sample a real course or student result?",
      answer: (
        <>
          No. The database lesson and sample answer illustrate the workflow.
          They are not a live product session, a published course or real
          student performance data.
        </>
      ),
    },
    {
      question: "How do I get access to a course?",
      answer: (
        <>
          Sign in, browse the catalog and open a course to see its details and
          enrollment options. Some courses are restricted to an organization or
          department; contact the course owner if you need access.
        </>
      ),
    },
    {
      question: "Where can our teaching team get help?",
      answer: (
        <>
          Start with the{" "}
          <Link
            to="/help"
            className="font-medium text-primary underline underline-offset-4"
          >
            help center
          </Link>{" "}
          for guidance on courses, learning and accounts. For teaching
          permissions or organizational access, contact your organization’s
          administrator.
        </>
      ),
    },
  ];
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto grid max-w-7xl scroll-mt-24 gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Before you begin
        </p>
        <h2
          id="faq-title"
          className="mt-3 font-headline text-3xl font-bold tracking-tight text-text-strong sm:text-4xl"
        >
          A few useful answers.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Understand the workflow and how to get started.
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold text-text-strong [&::-webkit-details-marker]:hidden">
              {question}
              <Plus
                className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-5 pr-6 text-sm leading-relaxed text-text-muted">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
