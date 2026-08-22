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
  | "learning-program"
  | "career-path";

export interface PolicyDocument {
  slug: PolicySlug;
  title: string;
  /** Shown verbatim under the heading. */
  lastUpdated: string;
  /** Markdown body. */
  body: string;
}

/**
 * Placeholder policy bodies.
 *
 * These are structural drafts so the previously dead footer links resolve to
 * real pages. They have NOT been through legal review — every page renders a
 * visible draft notice so nobody mistakes them for binding terms.
 */
const DRAFT_DATE = "27 July 2026";
const ACADEMIC_POLICY_DRAFT_DATE = "22 August 2026";

export const POLICY_DOCUMENTS: Record<PolicySlug, PolicyDocument> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    lastUpdated: DRAFT_DATE,
    body: `
## What we collect

- **Account details** — name, email address, and the organisation or department your account belongs to.
- **Learning activity** — course enrolments, lesson completions, quiz attempts and answers, interview sessions and transcripts, and spaced-repetition review history.
- **Usage data** — which materials you opened and for how long, used to estimate engagement and retention.
- **Technical data** — authentication sessions, IP address, and browser type, retained for security auditing.

## Why we use it

To deliver and personalise the course experience: scheduling reviews, deciding when lessons unlock, grading assessments, and reporting your progress to you and to the teachers responsible for your courses.

Aggregate, de-identified figures are used to monitor platform health and cost.

## AI processing

Course materials and your submitted answers may be sent to third-party AI model providers for processing — content extraction, question generation, and interview evaluation. Providers are used under contract and are not permitted to train on your data.

## Who can see your data

- **Teachers** of a course you're enrolled in can see your progress, attempts, and interview outcomes for that course.
- **Administrators** of your organisation can see aggregate activity and manage accounts.
- Other learners cannot see your individual results.

## Retention

Learning records are retained for as long as your account is active, and afterwards only where an organisation is required to keep assessment records.

## Your rights

You can request a copy of your data, correction of inaccuracies, or deletion of your account. Contact your organisation's administrator.
`,
  },
  terms: {
    slug: "terms",
    title: "Terms of Service",
    lastUpdated: DRAFT_DATE,
    body: `
## Using the platform

Access is granted through your organisation. Keep your credentials to yourself and don't share an account — assessment results are attributed to the account that produced them.

## Academic integrity

Quizzes and interviews are intended to measure your own understanding. Submitting another person's work, using an unpermitted tool during an assessment, or attempting to extract answers from the system may result in results being voided and access withdrawn.

## Content

Course materials remain the property of their authors or your organisation. You may use them for your own study, and may not redistribute them.

Content you submit — answers, discussion posts — remains yours. You grant the platform the licence needed to store, display, and evaluate it as part of delivering the course.

## Acceptable use

Don't attempt to gain access to accounts or data that aren't yours, disrupt the service, or use it to store or transmit unlawful material.

## Availability

The service is provided as-is. Availability isn't guaranteed, and features may change as the platform develops.

## Changes

These terms may be updated. Material changes will be communicated through the platform.
`,
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    lastUpdated: DRAFT_DATE,
    body: `
## What we use

The platform uses browser storage for a small number of strictly functional purposes:

- **Authentication** — keeping you signed in between page loads, and holding the short-lived token that authorises requests.
- **Preferences** — your interface language and sidebar state.
- **Security** — detecting and limiting abusive request patterns.

## What we don't use

No advertising cookies, no cross-site tracking, and no third-party analytics that profile you as an individual.

## Managing them

You can clear browser storage at any time through your browser settings. Doing so signs you out, because the authentication token is removed.
`,
  },
  "learning-program": {
    slug: "learning-program",
    title: "Learning Program Policy",
    lastUpdated: ACADEMIC_POLICY_DRAFT_DATE,
    body: `
## I. Purpose and scope

This policy explains how Learning Programs are created, published, assigned, completed, changed, and reported on the platform. It applies uniformly to every organisation, faculty, department, administrator, Faculty Dean, manager, and student using Learning Programs.

A Learning Program is an academic container made up of one or more Career Paths. A Career Path may be included in more than one Learning Program.

## II. Roles and responsibilities

- **Platform and organisation administrators** configure system, organisation, account, and participation limits. They do not directly manage a student's academic enrolment or approve academic path changes.
- **Faculty Deans** manage Learning Programs within their faculty scope, enrol students, and review Career Path change requests.
- **Managers** may create, edit, and publish Learning Programs and enrol students when their assigned scope permits it. They cannot choose a student's first Career Path.
- **Students** review the available paths in their pinned Program version and choose their own initial Career Path.

All actions are subject to active account, role, organisation, and faculty assignments.

## III. Program creation and publication

A Learning Program must have a name, a unique slug within its applicable scope, a faculty, and at least one published Career Path before it can be published.

A draft may be edited freely. Publishing creates a frozen version. A published version cannot be changed or have a Career Path removed. Further changes require a new draft version. Existing students remain attached to the Program version used when they enrolled; a later version applies only to later enrolments unless an explicit migration is introduced.

Publishing, archiving, withdrawing a student, and other one-way operations require explicit confirmation in the user interface.

## IV. Student enrolment

Students are enrolled into a Learning Program, not directly into a Career Path. A Program must be published and not archived before accepting new enrolments.

The maximum number of concurrent Learning Program enrolments is configured at organisation level. The platform default is one. Enrolments awaiting path selection and active enrolments count toward this limit; completed enrolments do not.

A student may participate in more than one Program at the same time only when the organisation's configured limit allows it. Course progress and completion awards are shared across Programs, while each Program Enrollment keeps its own status and completion history.

## V. Initial Career Path selection

After enrolment, the student must select one Career Path from the exact Program version assigned to them. There can be only one active Career Path for each Program Enrollment.

The first selection belongs to the student. Managers, Faculty Deans, and administrators cannot select it on the student's behalf. An archived Career Path cannot be selected by a new student.

## VI. Career Path change requests

An active student may request a change from the current Career Path to another Career Path contained in the same pinned Program version, subject to all of the following:

- the target differs from the current Career Path;
- the target is not archived;
- the Program Enrollment and current path are not completed;
- there is no other pending request for that Program Enrollment;
- the number of previously approved changes is below the Program version's limit, which defaults to three.

The request must include a reason. Submitting a request does not change the active path.

## VII. Review and decision

Only an active Faculty Dean within the Program's faculty scope may approve or reject a pending request. A reviewer cannot approve their own request.

Before approval, the platform rechecks the student's status, current path, change limit, and target path. If the target is archived while the request is pending, the request is invalidated with that reason. Rejection leaves the current path unchanged.

On approval, the old path attempt is closed with a progress snapshot and a new path attempt begins. The Program report retains the current path and the full transition history.

## VIII. Progress preservation and course access

A course completed by a student remains completed across Learning Programs and Career Paths. If the completed course also appears in the new path, it is counted immediately toward that path.

When a path changes, access to shared in-progress courses continues through the new path. Access to an old-only incomplete course may end when no other active Program or Career Path grants access to it. A completed course record is not removed by a path change or withdrawal.

## IX. Completion

Completing the active Career Path completes that Program Enrollment. Completion is evaluated against the exact Career Path version pinned to the active attempt.

Completing one Program Enrollment does not automatically complete another Program Enrollment, even when the two Programs contain the same Career Path. Each Program retains its own version, status, and history.

A completed Program Enrollment cannot change Career Path and cannot be withdrawn through the ordinary withdrawal process. Any exceptional correction must use a separately authorised and audited administrative procedure.

## X. Archiving and continuity

Archiving a Learning Program blocks new enrolments but does not interrupt students already enrolled. Archiving a Career Path blocks new selections and new switch approvals to that path, while students already active on it may continue under their pinned version.

## XI. Records, reporting, and transparency

Program reports may include enrolment status, pinned Program version, current Career Path, current progress, approved change count, pending requests, and transition history.

Historical path attempts retain the snapshot recorded when the student left that path. Later course completions do not rewrite the historical snapshot, although they may count toward the current path through shared completion awards.

Access to individual student records is restricted by role, organisation, and faculty scope and remains subject to the [Privacy Policy](/policy/privacy).

## XII. Requests, corrections, and complaints

Students should first contact the Faculty Dean or authorised academic manager responsible for their Learning Program regarding enrolment, path selection, path change, completion, or reporting concerns. Account, privacy, or platform operation concerns should be directed to the organisation administrator or the platform's official support channel.

The requester may be asked to provide the Program, relevant dates, and supporting information so the issue can be verified. Decisions and corrections that alter academic records must be authorised and auditable.

## XIII. Changes to this policy

This policy may be updated when platform functionality, academic procedures, or applicable requirements change. The current version and its last-updated date will be published on this page. Material changes should be communicated through the platform before they take effect.
`,
  },
  "career-path": {
    slug: "career-path",
    title: "Career Path Policy",
    lastUpdated: ACADEMIC_POLICY_DRAFT_DATE,
    body: `
## I. Purpose and scope

This policy explains how Career Paths are authored, published, included in Learning Programs, selected, followed, completed, changed, and reported on the platform. It applies uniformly across all organisations, faculties, and departments.

A Career Path is a versioned sequence of stages and courses designed to guide a student toward a defined learning or career outcome.

## II. Authoring responsibility

Only authorised managers and Faculty Deans may create or edit Career Paths within their assigned organisation and faculty scope. Administrators configure the platform and accounts but do not directly assign students to Career Paths or make academic decisions for them.

A Career Path must have a name and slug. Its stages, courses, required-course flags, ordering, and unlock rules must be reviewable before publication.

## III. Drafts, publication, and versions

A draft Career Path may be edited before publication. Publishing freezes the version, including its course membership, stage ordering, required-course rules, and progression settings.

A published version cannot be deleted or changed in place. Further changes require a new draft version. A new version does not retroactively change a Learning Program version, Program Enrollment, or Path Attempt that already points to an earlier version.

Where a draft contains unpublished course dependencies, the author must explicitly resolve them before completing publication.

## IV. Use in Learning Programs

A Career Path may appear in multiple Learning Programs. Each Program version stores the exact published Career Path version selected by the author; it does not automatically follow later Career Path versions.

Students are not directly enrolled into a Career Path by a manager. They receive access through a Learning Program Enrollment and select one of the paths included in their pinned Program version.

## V. Path selection and active status

A student may have one active Career Path for each Program Enrollment. Participation in another Program may create another active path without replacing the first, subject to the organisation's concurrent Program limit.

The student chooses the initial path. A later change requires the formal request and Faculty Dean review described in the [Learning Program Policy](/policy/learning-program).

## VI. Stages and progression

The first stage is always available. Later stages follow the unlock rule stored in the published Career Path version, such as always available, available after progress in the previous stage, or available after the previous stage's required work is satisfied.

Unknown or invalid progression rules fail closed: the platform must not silently unlock restricted learning content.

Reordering stages in a draft does not silently rewrite their configured unlock rules. Authors are responsible for reviewing warnings caused by a changed stage position before publication.

## VII. Required courses and completion

Career Path completion is based on the required courses in the student's pinned path version. A non-empty path is completed when all required courses are satisfied under the published rules.

Optional courses may support learning and remain visible where access permits, but they do not block completion unless the published version explicitly marks them as required.

Completing the active Career Path completes the corresponding Learning Program Enrollment.

## VIII. Shared course completion

Course completion belongs to the student and course, not only to one Career Path. Once awarded, completion may satisfy the same course in another Career Path or Learning Program.

Changing paths does not erase completed courses. A later reduction in mutable progress does not automatically remove an awarded completion record. Any exceptional reversal must be separately authorised and audited.

Path progress is always calculated against the exact published Career Path version pinned to the student's Path Attempt.

## IX. Path changes

Students cannot directly replace their active path. They may request a change only within the same pinned Learning Program version and only while the current Program Enrollment remains active and incomplete.

When a change is approved:

- the old Path Attempt stops at a frozen exit snapshot;
- the new Path Attempt starts a separate timeline;
- shared completed courses count toward the new path;
- shared in-progress course access is preserved;
- old-only incomplete course access may end when no other active entitlement grants it.

The old and new attempts remain available in authorised academic reporting.

## X. Archiving

A published Career Path is archived rather than deleted. Archiving prevents new Program drafts from adding it, prevents new students from selecting it, and invalidates pending changes targeting it.

Students already active on the archived path may continue under their pinned version. Archiving does not rewrite their progress, completion awards, or history.

## XI. Reporting and readiness

Current progress and readiness are calculated from the current active Path Attempt and its pinned version. A switched-out, cancelled, or completed attempt is reported using its exit snapshot rather than recalculating its old percentage from later activity.

Individual student records are visible only to authorised roles within the relevant organisation and faculty scope and remain subject to the [Privacy Policy](/policy/privacy).

## XII. Requests, corrections, and complaints

Students should contact the responsible Faculty Dean or authorised academic manager if they believe a path, course requirement, progress result, archive status, or transition history is incorrect. The requester may be asked to identify the Learning Program, Career Path, affected course, and relevant dates.

Changes to published academic history require an authorised, recorded correction process. Support personnel must not silently edit frozen versions or historical snapshots.

## XIII. Changes to this policy

This policy may be revised when Career Path functionality, academic procedures, or applicable requirements change. The current text and last-updated date will be published on this page. Material changes should be communicated through the platform before taking effect.
`,
  },
};

export const POLICY_ORDER: PolicySlug[] = [
  "privacy",
  "terms",
  "cookies",
  "learning-program",
  "career-path",
];
