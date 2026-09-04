/**
 * FAQ + policy copy for the public /help and /policy/* pages.
 *
 * Deliberately a code module rather than entries in `i18n/locales/*.json`:
 * those files are already ~172K/200K across 68 namespaces and are NOT lazily
 * split, so long-form prose there would land in every page load. Keeping it here
 * means it ships only with the route chunk that imports it.
 *
 * Also deliberately not database-backed. These answers describe how *this build*
 * behaves (how spaced repetition schedules cards, why a lesson is locked), so
 * they change with the code and belong in the repo alongside it.
 *
 * IMPORTANT — the policy text below is a PLACEHOLDER skeleton, not reviewed legal
 * copy, and there is no acceptance tracking: nothing records which version a user
 * agreed to. Before this platform handles real user data, the policies need legal
 * review and a versioned `policy_documents` / `policy_acceptances` pair so
 * acceptance can be proven per version. See the note in /policy.
 */

export type FaqCategory =
  | "getting_started"
  | "learning"
  | "quizzes"
  | "interviews"
  | "account";

export interface FaqEntry {
  /** Stable id — used as the anchor target for deep links (#q-<id>). */
  id: string;
  category: FaqCategory;
  question: string;
  /** Markdown. Rendered via RichContent. */
  answer: string;
}

export const FAQ_CATEGORY_ORDER: FaqCategory[] = [
  "getting_started",
  "learning",
  "quizzes",
  "interviews",
  "account",
];

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  getting_started: "Getting started",
  learning: "Learning and progress",
  quizzes: "Quizzes and grading",
  interviews: "AI interviews",
  account: "Account and access",
};

export const FAQ_ENTRIES: FaqEntry[] = [
  // ── Getting started ──────────────────────────────────────────────────────
  {
    id: "enroll",
    category: "getting_started",
    question: "How do I enrol in a course?",
    answer:
      "Open **Explore** from the top navigation, pick a course, and choose " +
      "*Enrol*. Some courses are restricted to an organisation or department — " +
      "if you can see a course but can't enrol, your account isn't in its " +
      "audience. Ask the course owner to add you.",
  },
  {
    id: "lesson-locked",
    category: "getting_started",
    question: "Why is a lesson locked?",
    answer:
      "Lessons unlock in order, and a lesson can additionally require that you:\n\n" +
      "- complete its prerequisite lessons,\n" +
      "- reach a minimum spaced-repetition coverage on earlier material, or\n" +
      "- pass an interview gate.\n\n" +
      "The lock tooltip states which condition is outstanding.",
  },
  {
    id: "find-courses",
    category: "getting_started",
    question: "Where do I see the courses I'm already in?",
    answer:
      "Your **Dashboard** lists in-progress courses with a resume link. " +
      "**Progress** shows the fuller picture across every enrolment.",
  },

  // ── Learning and progress ────────────────────────────────────────────────
  {
    id: "spaced-repetition",
    category: "learning",
    question: "How does spaced repetition decide when to show me a card again?",
    answer:
      "Each card carries an *easiness factor* (EF) and an interval. Answer well " +
      "and the interval grows; answer poorly and it shrinks and the card returns " +
      "sooner. New cards start at an EF of 2.5. A lower EF means the system has " +
      "learned that this particular card is hard for you, so it will resurface " +
      "more often.",
  },
  {
    id: "cards-due",
    category: "learning",
    question: "What are 'cards due' and do I have to clear them?",
    answer:
      "Cards due are review items whose scheduled date has passed — see " +
      "**Study → Cards due**. Clearing them isn't mandatory, but reviews are " +
      "what keep earlier material from decaying, and some lessons won't unlock " +
      "until your coverage of prior material is high enough.",
  },
  {
    id: "knowledge-map",
    category: "learning",
    question: "What is the knowledge map on a reading lesson?",
    answer:
      "A concept graph your teacher published for that lesson: nodes are " +
      "concepts, edges show prerequisite and related links. It appears as its " +
      "own section under the reading, and only when a teacher has actually " +
      "published one.",
  },
  {
    id: "progress-not-updating",
    category: "learning",
    question: "I finished a lesson but my progress didn't change.",
    answer:
      "Completion is recorded when you mark the lesson complete, not merely by " +
      "scrolling. Open the lesson and use the completion control. If it still " +
      "doesn't update, reload — progress is cached briefly in the browser.",
  },

  // ── Quizzes and grading ─────────────────────────────────────────────────
  {
    id: "quiz-attempts",
    category: "quizzes",
    question: "How many attempts do I get at a quiz?",
    answer:
      "It depends on the quiz: the attempt limit is set per quiz and shown " +
      "before you start. When no limit is set, attempts are unlimited.",
  },
  {
    id: "quiz-grading-delay",
    category: "quizzes",
    question: "Why is my quiz still ungraded?",
    answer:
      "Multiple-choice and other objective questions grade instantly. Short " +
      "answer and code questions may need your teacher to review them, so those " +
      "attempts sit as *submitted* until marked.",
  },
  {
    id: "expected-time",
    category: "quizzes",
    question: "What does the expected time on a question mean?",
    answer:
      "A target response time the question author set. It informs retention " +
      "scoring — answering correctly but far slower than expected is treated as " +
      "weaker recall than answering correctly and quickly. It is not a hard " +
      "timer unless the quiz has one.",
  },

  // ── AI interviews ────────────────────────────────────────────────────────
  {
    id: "interview-what",
    category: "interviews",
    question: "What happens in an AI interview?",
    answer:
      "You answer questions conversationally and the system evaluates your " +
      "responses against the criteria your teacher configured. Some interviews " +
      "act as gates: passing unlocks later lessons.",
  },
  {
    id: "interview-practice",
    category: "interviews",
    question:
      "What's the difference between a practice run and a real attempt?",
    answer:
      "Practice runs give you feedback without producing a graded verdict and " +
      "never count towards a gate. Real attempts are evaluated and recorded.",
  },
  {
    id: "interview-abandoned",
    category: "interviews",
    question: "My interview session was interrupted. What now?",
    answer:
      "An interrupted session is marked *abandoned* and receives no verdict. " +
      "You can start a new attempt if the interview's attempt limit allows it. " +
      "You can't have two live sessions for the same interview at once — resume " +
      "or abandon the existing one first.",
  },

  // ── Account and access ───────────────────────────────────────────────────
  {
    id: "change-language",
    category: "account",
    question: "Can I switch the interface language?",
    answer:
      "Yes — **Settings → Profile**. English and Vietnamese are supported, and " +
      "the choice persists to your account.",
  },
  {
    id: "mfa",
    category: "account",
    question: "How do I turn on two-factor authentication?",
    answer: "**Settings → Security**, then follow the enrolment steps.",
  },
  {
    id: "data-questions",
    category: "account",
    question: "What data does the platform hold about me?",
    answer:
      "Your enrolments, quiz and interview attempts, review history, and " +
      "engagement with materials. See the [Privacy Policy](/policy/privacy) for " +
      "detail, and contact your administrator for a copy or deletion request.",
  },
];

// ─── Policies ────────────────────────────────────────────────────────────────

export type PolicySlug =
  | "privacy"
  | "terms"
  | "cookies"
  // The academic documents below are NOT part of the static manifest's link
  // surfaces (footer / help fallback) — they are seeded drafts an admin must
  // review and publish, so they only surface through the server-driven
  // /policies index. Server slugs may still be one of these; the /policy/$slug
  // route accepts any slug the server serves.
  | (string & {});

/**
 * Display titles for the policy slugs the footer advertises.
 *
 * The policy BODIES live in the database now (see the `policies` feature) and
 * arrive over `/policies`. Only the titles stay here, for the two places that
 * must render a policy link before — or without — a network round trip: the
 * footer, which is chrome on every page including error screens, and the
 * sibling-nav skeleton on a policy page that is still loading.
 *
 * A title drifting from the published version is cosmetic and self-correcting:
 * the moment the fetch lands, the server's title wins.
 */
export const POLICY_TITLES: Record<PolicySlug, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  cookies: "Cookie Policy",
};

/** Static fallback order — the three always-published legal documents only. */
export const POLICY_ORDER: PolicySlug[] = ["privacy", "terms", "cookies"];
