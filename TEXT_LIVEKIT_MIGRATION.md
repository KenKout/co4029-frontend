# Moving TEXT onto the LiveKit room

**Status:** plan only. No `src/` file is changed by this document.

**Goal:** typed interview turns stop being a second brain reachable over REST
`/respond` and become a second *door* into the same agent, the same `chat_ctx`,
and the same server-authoritative tool surface that voice already uses. One
room, one conversation.

**Scope boundary that shapes everything below:** onboarding stays on REST. The
backend refuses to mint a dispatching token before `onboarding_stage ==
"completed"`, so during setup there is no participant to receive a turn. That is
stated in `src/lib/interview/text-transport.ts:6-10` and enforced client-side at
`src/lib/interview/text-transport.ts:81-83`.

**Starting position, verified:** the LiveKit text path is not hypothetical — it
is already shipped and already ON. `VITE_INTERVIEW_LK_TEXT=1` in both `.env:4`
and `.env.example:23`. So this is not "build the live path"; it is "remove the
REST door and harden what is left". `npx tsc --noEmit` is clean at HEAD.

---

## a) Current-state map — the text turn lifecycle today

### a.1 The path a typed answer takes

| # | Step | Location |
|---|---|---|
| 1 | Candidate types. Text lands in `answerText` only | `WorkspaceInputArea.tsx:70` → `use-interview-turn-state.ts:17` |
| 2 | Debounced autosave to `localStorage` | `use-interview-drafts.ts:46-50` → `use-draft-autosave.ts:73-87` |
| 3 | Submit (Enter / Send / mic-finish) | `WorkspaceInputArea.tsx:71`, `:72` |
| 4 | Controller wrapper | `use-interview-actions.ts:202-205` |
| 5 | `handleRespond` entry, guards | `interview-answer-actions.ts:397-417` |
| 6 | Transport arbitration + duplicate-submit gate | `interview-answer-actions.ts:358-375` |
| 7 | Answer machine → `submitting`, draft captured | `interview-answer-actions.ts:424` → `use-answer-state/actions.ts:82-98` |
| 8a | **LiveKit branch** | `interview-answer-actions.ts:427-432` → `sendTurnViaLiveKit` `:319-350` |
| 8b | **REST branch** | `interview-answer-actions.ts:433-451` |
| 9 | Both converge on `applyRespondResult` | `interview-answer-actions.ts:215-289` |

Step 8a in detail. `sendTurnViaLiveKit` calls `chat.sendTurn` (`:325-329`) with
`turnAction: "answer"` hardcoded at `:327`. `chat` is the `useInterviewChat`
result, reached through a mutable ref because the actions are constructed
*outside* the room provider while the room only exists *inside* it
(`types.ts:36-43`; ref at `use-interview-actions.ts:146`; setter `:154-156`;
written by the workspace screen at `InterviewWorkspaceScreen.tsx:152-164`).

`useInterviewChat.sendTurn` (`use-interview-chat.ts:225-288`):

- registers a waiter keyed by `turn_key` **before** sending (`:241-243`) — the
  agent can publish `completed` before `sendText` resolves (`:239-240`)
- publishes on `lk.chat` via `room.localParticipant.sendText` with
  `turn_action` / `turn_key` stream attributes (`:247-250`,
  `control-protocol.ts:275-283`). Deliberately not `useChat().send`, which would
  double-publish over the deprecated `publishData` path
  (`use-interview-chat.ts:11-17`)
- resolves from the `abridge.interview.control` topic, not the send promise
  (`:146-196`), ordered by `seq` with stale events dropped at `:167`
- 60s ceiling (`:74`, `:257-278`); room drop fails every in-flight turn with
  `errorClass: "RoomDisconnected"` and `preserveDraft: true` (`:200-223`)

The control event's `state` **is** a serialized `InterviewSubmitAnswerResponse`
— the bridge publishes `model_dump(mode="json")` from the same
`from_step_result` the REST route uses (`control-protocol.ts:87-100`), parsed
field-by-field at `control-protocol.ts:158-201`. That is why one
`applyRespondResult` serves both transports today.

Step 8b in detail: `ctx.respond.mutateAsync` → `POST
/interview-sessions/{id}/respond` (`src/lib/api/hooks/interviews.ts:148-168`,
path at `:153`), with `Accept-Language` (`:158`) and an `onSuccess` that
invalidates `queryKeys.interviews.session(sessionId)` (`:160-167`).

### a.2 Every place the response becomes rendered UI state

`applyRespondResult` (`interview-answer-actions.ts:215-289`) writes in a fixed
order:

| Order | Line | Write | Downstream render |
|---|---|---|---|
| 1 | `:233` | `reconcileDeadline(time_remaining_seconds)` | `use-interview-drafts.ts:105-109` → `sessionDeadlineAtRef` → auto-close at `use-interview-sequencing.ts:113-149` |
| 2 | `:235-238` | End-confirmation early return → `applyEndConfirmation` `:38-49` | `restoreDraft` `:43`, `setAnswerText` `:44`, `setEndConfirmPrompt` `:45-47`, `setEndConfirming` `:48`; rendered by `workspace-helpers.tsx:68-74` (`EndConfirmationPanel`) |
| 3 | `:240` | `commitAnswerTurn` `:56-82` | transcript append deduped on `a-${submissionId}` (`:62-74`), `submitSucceeded` `:75`, `clearDraftAutosave` `:77`, `setAnswerText("")` `:80`, `setRecentSubmission` `:81` |
| 4 | `:242-248` | derive `isAdvance` / `finished` / `standaloneText` | `resolveStandaloneText` `:84-88` |
| 5 | `:250-262` | closing ceremony `:96-113` **or** follow-up `:115-139` | `setClosingCeremonyActive` `:111` → wrap-up bar `WorkspaceInputArea.tsx:36-54`; follow-up kind from `resolveAssistanceTurnKind` (`helpers.ts:20-28`); `reopenForFollowUp` `:112`, `:138` |
| 6 | `:268-271` | `planTransition` (pure, `transition-sequencing.ts:40-62`) | — |
| 7 | `:273-280` | finish: `presentFinalTransition` `:145-161` or `beginClosing("natural")` | `setPendingFinalTransition` `:151` |
| 8 | `:282-288` | advance: `presentNextQuestionTransition` `:169-189` | `setPendingNextQuestion` `:178`, `setPhase("transition")` `:179` |

Nothing here reveals a question card directly. The next question is *parked*
and the phase flips to `"transition"`; the card appears only when the transition
turn finishes presenting. That handoff is `useTurnPresentedHandler`
(`use-interview-sequencing.ts:14-111`), fired from `AiTypingMessage` →
`use-focused-stage-turns.ts` → `WorkspaceStage.tsx:69`:

- every AI turn is recorded in `presentedAiTurnIds` (`:46-50`) — required
  unconditionally because the docked transcript withholds the newest AI turn
  (`transcript-visibility.ts:33-42`)
- `pendingFirstQuestion` → `setCurrentQuestion` / `setPhase("questioning")` /
  append card (`:52-66`)
- `pendingNextQuestion` → same, mid-interview (`:70-82`)
- `pendingFinalTransition` → `beginClosing("natural")` (`:85-89`)
- `closing` turn + `pendingFinishResult` → `setPhase("results")` (`:91-99`)

Failure rendering: `reportAnswerFailure` (`:195-213`) for REST/throw,
`rejectionMessage` (`:299-311`) for a control-stream rejection consumed at
`:333-337`. Both keep the draft, add no transcript entry, and do not advance.

Agent-spoken text does **not** come through the transcript array when the agent
is live. `agentWillSpeak: true` (set only on the LiveKit path, `:348`)
suppresses `standaloneText` at `:246-248`, and the words arrive on
`lk.transcription` instead — paced by the agent's own `TranscriptSynchronizer`
and mirrored into the question card by `use-agent-spoken-text.ts:100-127`, wired
at `WorkspaceStage.tsx:44`, `:63-64`.

### a.3 State atoms and their owners

| Atom | Declared | Notes |
|---|---|---|
| `transcript` | `use-interview-turn-state.ts:16` | item type `ConversationTurn`, `lib/interview/types.ts:33-51`, nine `kind` values `:41-50`. 19 writers across 6 modules |
| `currentQuestion` | `use-interview-turn-state.ts:14-15` | keys the answer machine `:22`, the autosave key `use-interview-drafts.ts:48`, and pacing `use-interview-progress.ts:66` |
| `answerText` | `use-interview-turn-state.ts:17` | the composer's text |
| `answer` (reducer) | `use-interview-turn-state.ts:22` | six statuses, `use-answer-state/state.ts:10-16` |
| `endConfirming` / `endConfirmPrompt` | `use-interview-turn-state.ts:36-37` | one reader: `workspace-helpers.tsx:68-74` |
| `recentSubmission` | `use-interview-turn-state.ts:42-46` | `workspace-helpers.tsx:92-98` |
| `phase` | `use-interview-phase-state.ts:70` | `InterviewPhase`, `turn-factory.ts:29-36` |
| `pendingFirstQuestion` | `use-interview-phase-state.ts:84-85` | also load-bearing for **audio**: keeps `resolveAgentOwnsTheVoice` false (`agent-voice-presentation.ts:193`) so the client can narrate the server-authored transition line the agent never receives |
| `pendingNextQuestion` | `use-interview-phase-state.ts:90-91` | |
| `pendingFinalTransition` | `use-interview-phase-state.ts:94` | |
| `closingCeremonyActive` | `use-interview-phase-state.ts:37` | set `true` at exactly one site (`interview-answer-actions.ts:111`), **never set false** — a one-way latch |
| `presentedAiTurnIds` | `use-interview-phase-state.ts:63-65` | a *second*, independent set exists stage-locally in `use-focused-stage-turns.ts:48-50` |
| `sessionDeadlineAtRef` / `timeoutTriggeredRef` | `use-interview-phase-state.ts:123-124` | refs, not state — see the timer caveat in (b) |

Draft persistence: key `abridge:iv-draft:<sessionId>:<questionId>`
(`use-draft-autosave.ts:22-31`), 400ms debounce (`:23`), blank draft *removes*
the key rather than storing `""` (`:80-81`), all storage access try/caught
(`:33-55`). Restore is once-per-question, guarded by `restoredQuestionRef` and
gated on `status === "draft"` with an empty composer
(`use-interview-drafts.ts:58-72`).

Note the two-store split: typing writes only `answerText`
(`WorkspaceInputArea.tsx:70`). The reducer's `draft` is populated **only** by
`beginSubmit` (`interview-answer-actions.ts:424`) and `restoreDraft`
(`use-interview-drafts.ts:68`, `interview-answer-actions.ts:43`). That is what
lets the failed/submitting cards read `answerStatus.draft`
(`workspace-helpers.tsx:79`, `:84`).

### a.4 Progress is not server-driven

`currentQuestionNumber` is recomputed from the transcript —
`transcript.filter(kind === "question")`, deduped by turn id
(`use-interview-progress.ts:50-57`). `totalQuestions` is a hardcoded `null`
(`use-interview-progress.ts:61`) because the learner API exposes no total
(`:58-60`). So the header bar falls back to elapsed ÷
`config.time_limit_minutes` (`stages/helpers.ts:39-56`, fed from
`InterviewWorkspaceScreen.tsx:175`). **No respond-response field feeds progress
display.** This is a gift for the migration: the whole progress surface is
transport-agnostic already.

---

## b) The response-contract problem

Today the client renders a text turn from **one object**. In the target
architecture the agent streams, the tool surface is server-authoritative, and
there is no per-turn response body to render from. Below is every field of
`InterviewSubmitAnswerResponse` — 15 of them, declared at
`openapi-types.d.ts:7169-7199` and widened at `types.ts:445-457` — with its
actual consumers and where it must come from instead.

Legend for the target column: **T** = transcription stream (`lk.transcription`)
· **C** = control topic (`abridge.interview.control`) · **R** = server-pushed
state reminder · **∅** = nowhere, field is already dead.

### b.1 Fields with real consumers

| Field | Declared | Consumed at | Target |
|---|---|---|---|
| `next_question` | `:7170` | `interview-answer-actions.ts:242` (`isAdvance`), `:282`, `:172`, `:178`; `transition-sequencing.ts:55`; `interview-assistance-actions.ts:124-129`; parsed `control-protocol.ts:162-178` | **C**. Cannot come from T — the client needs the structured `{id, prompt_text, question_type}` to key the answer machine, the autosave key, and pacing. Must be the `next_question` tool's result, published on control. |
| `is_finished` | `:7172` (required) | `interview-answer-actions.ts:243`; `transition-sequencing.ts:44`; `interview-assistance-actions.ts:112` | **C** |
| `should_finish` | `:7186` | same three sites (takes precedence via `??`) | **C**. Collapse with `is_finished` in the new contract — two fields for one decision is legacy. |
| `time_remaining_seconds` | `:7176` | `interview-answer-actions.ts:233`; `interview-assistance-actions.ts:110`; → `use-interview-drafts.ts:105-109` | **C or R**. No other source exists. See the timer caveat below — this is the single most dangerous field to drop. |
| `ai_turn_text` | `:7178` | `interview-answer-actions.ts:85-87` (suppressed when `agentWillSpeak`, `:246-248`) **and** `end-confirmation.ts:57` (**not** suppressed) | **T** for the ordinary case; **C** for the end-confirmation prompt. See b.3. |
| `ai_followup_text` | `:7174` | `interview-answer-actions.ts:85-87`; `transition-sequencing.ts:48`, `:57`; `end-confirmation.ts:57`; `interview-assistance-actions.ts:114` | **T** for display; **C** where it is a *fallback for transition text* (`transition-sequencing.ts:57`) |
| `transition_text` | `:7196` | `transition-sequencing.ts:47`, `:57` ← `interview-answer-actions.ts:268-271` | **C**. The transition beat is a client sequencing primitive, not speech — it gates `pendingNextQuestion`. If it only arrives as audio the client cannot know when to reveal the card. |
| `assistance_kind` | `:7188` | `interview-answer-actions.ts:125` → `helpers.ts:20-28`; `interview-assistance-actions.ts:34-35` | **C**. Note the request/response unions do not mirror: request is `clarify \| explain_term \| hint` (`control-protocol.ts:41-47`), response is `repeat \| clarification \| term \| hint` (`:7188`). |
| `pending_confirmation` | `:7190` | `end-confirmation.ts:37` ← `interview-answer-actions.ts:235` | **C** |
| `interaction_state` | `:7192` | `end-confirmation.ts:48` (`isClosingTurn`) ← `interview-answer-actions.ts:251` | **C** |

### b.2 Fields that are already dead — delete, do not re-home

Verified by grep across `src/`: each of these is *parsed* by
`control-protocol.ts` and never read by any consumer.

| Field | Declared | Parsed at | Consumers |
|---|---|---|---|
| `language` | `:7180` | `control-protocol.ts:186` | none. (`interviewLanguage` comes from the **onboarding** response, `interview-onboarding-actions.ts:123`, and from start, `interview-start-actions.ts:104-106`.) |
| `should_narrate` | `:7182` | `control-protocol.ts:187` | none |
| `should_await_response` | `:7184` | `control-protocol.ts:188` | none (test fixture only, `interview-answer-transport.test.ts:42`) |
| `transition_id` | `:7194` | `control-protocol.ts:195` | none |
| `transition_target` | `:7198`, `types.ts:449` | `control-protocol.ts:197-199` | none. `plan.target` is derived by `planTransition` itself (`transition-sequencing.ts:53`, `:59`); `RespondTransitionFields` (`:12-18`) does not even declare the field. |

That is 5 of 15 fields. The new contract should carry **10**, not 15.

### b.3 The three genuinely hard cases

**1. `ai_turn_text` has two jobs, and only one is suppressed.**
`applyRespondResult` suppresses `standaloneText` when the agent will speak
(`:246-248`), which correctly avoids double-rendering. But
`applyEndConfirmation` returns *before* that at `:235-238`, and
`endConfirmationPrompt` reads `ai_turn_text || ai_followup_text` directly
(`end-confirmation.ts:57`). So on the live transport the end-confirmation prompt
is still rendered from the payload — which means the candidate sees it in the
panel *and* hears the agent say it. **Decision needed:** either the agent does
not voice the confirmation question (and control carries the text), or the panel
renders a static prompt and lets the audio carry the wording. Cannot be decided
from the frontend.

**2. `time_remaining_seconds` has no fallback, and its absence is silent.**
`reconcileDeadline` returns early on `null` (`use-interview-drafts.ts:106`), the
ref stays `null`, `useInterviewTimeout` bails (`use-interview-sequencing.ts:127-135`),
and **no auto-close ever fires**. That is the documented behaviour for a session
with no time limit (`use-interview-drafts.ts:103-104`) — and it is
*indistinguishable* from a backend that simply stopped sending the field. A
streaming agent with no per-turn body will produce exactly that. Second, subtler
problem: the deadline is a **ref**, and the timeout effect's deps are
`[beginClosing, phase, sessionId]` (`use-interview-sequencing.ts:149`), so a
mid-session reconciliation does **not** reschedule the pending `setTimeout`. It
lands only on the next `phase` change — which on the happy path is the
`questioning ⇄ transition` flip, so it works today by accident. Push a
`time_remaining_seconds` in the state reminder and this keeps working; drop it
and the timer dies quietly.

**3. `next_question` is a tool result, and the tool can refuse.** The backend
direction refuses `next_question` until the current question's outcome is
covered. Today the client has no representation for "the agent declined to
advance" other than `TurnRejection`, whose members are all *validation* failures
(`control-protocol.ts:79-85`: `empty_text`, `text_too_long`,
`invalid_turn_action`, `invalid_turn_key`, `turn_in_flight`,
`session_closing`). A refusal-to-advance is not a rejection of the candidate's
turn — the answer *was* graded, the interview simply stays on this question.
Rendering it through `rejectionMessage` (`:299-311`) would wrongly preserve the
draft and re-show the composer with the old text. **Backend contract decision
needed:** a `completed` event whose `state.next_question` is null and which
carries a follow-up, versus a new non-error status.

---

## c) Deletion list

### c.1 `src/lib/interview/text-transport.ts` (88 lines) — delete entirely

Exports `livekitTextEnabled` (`:20-22`), `TextTransport` (`:24`),
`TextTransportReason` (`:32-41`), `TextTransportDecision` (`:43-46`),
`resolveTextTransport` (`:56-62`), `decideTextTransport` (`:70-88`).

The five `TextTransportReason` codes and why each stops existing:

| Code | `:line` | Fate |
|---|---|---|
| `flag-off` | `:34` | gone with the flag |
| `not-hybrid` | `:36` | replaced by a **product** question, not a transport one: a `supported_modes === "text"` config still needs a room. See risk R6. |
| `onboarding-incomplete` | `:38` | becomes the REST-onboarding boundary in (d), not a transport decision |
| `room-disconnected` | `:40` | becomes the rejoin UX in (d) — the only one that turns into real work |
| `livekit` | `:41` | the only outcome, so no longer worth naming |

Consumers that must change first, in order:

1. `src/routes/course-interview.tsx:2` (import), `:57` and `:105` — remove
   `livekitTextEnabled()` from the `roomActive` and `prefetch` predicates. This
   is the *first* edit of the whole migration: while the flag is in the
   predicate, removing the module breaks the room lifecycle.
2. `src/routes/_components/course-interview/InterviewWorkspaceScreen.tsx:13`
   (import), `:57` — `useInterviewChat(room, { enabled: livekitTextEnabled() })`
   becomes unconditionally enabled.
3. `src/routes/_components/course-interview/interview-answer-actions.ts:9`
   (import), `:363-367` — inside `resolveSubmitGate`.
4. `src/lib/interview/__tests__/text-transport.test.ts` — delete.
5. `src/routes/_components/course-interview/__tests__/interview-room-activation.test.ts`
   — its local `roomActive` mirror takes a `flagOn` arg (`:25`, `:32`); drop the
   parameter rather than the file.

### c.2 `src/lib/interview/transport-reporter.ts` (45 lines) — delete entirely

Its whole reason for existing is that the REST fallback is silent (`:4-11`).
With one transport there is nothing to arbitrate and nothing to report.

Consumers: `interview-answer-actions.ts:10` (import), `:368` (call);
`src/lib/interview/__tests__/transport-reporter.test.ts` (delete — it also
covers `decideTextTransport`, so it dies with c.1 either way).

### c.3 The REST fallback branch in `handleRespond`

- `interview-answer-actions.ts:433-451` — the `else` arm: `respond.mutateAsync`
  and its `applyRespondResult` call.
- `interview-answer-actions.ts:358-375` — `resolveSubmitGate` collapses to a
  pending/duplicate guard. The `viaLiveKit` return member disappears; `blocked`
  keeps only `chat.pending` (`:373`).
- `interview-answer-actions.ts:427-432` — the branch becomes a straight call.
- `interview-answer-actions.ts:348` — `agentWillSpeak` becomes unconditionally
  true, so the parameter (`:222-228`) and the `args.agentWillSpeak ? null : …`
  expression (`:246-248`) can both go, and `resolveStandaloneText` (`:84-88`)
  becomes dead on the answer path.
- `interview-answer-actions.ts:27-29` — the `RespondResult` type alias is
  derived from the REST mutation. Re-source it from
  `ControlTurnState` (`control-protocol.ts:100`).
- `interview-answer-actions.ts:195-213` — `reportAnswerFailure` handles
  `ApiError` / HTTP 429 (`:201`, `:206`). There is no HTTP status on the live
  path; merge it with `rejectionMessage` (`:299-311`).
- `interview-answer-actions.ts:390-395` — the doc comment describing the
  two-transport rule.

**Do not delete `useInterviewRespond`** (`src/lib/api/hooks/interviews.ts:148-168`).
It still has three live callers on the assistance path:
`interview-assistance-actions.ts:102` (clarify/hint/explain_term), `:146`
(end-confirm), `:171` (end-cancel). It only becomes deletable after step 6.

Also note: the live path loses the mutation's `onSuccess` cache invalidation
(`interviews.ts:160-167`). Nothing currently reads
`queryKeys.interviews.session(sessionId)` during questioning — the two polls in
`use-interview-server-sync.ts` are gated off — so this is latent, not a live
bug. Flag it so it is not rediscovered.

### c.4 Tests

`src/routes/_components/course-interview/__tests__/interview-answer-transport.test.ts`
— 3 of its 6 cases exist purely to pin the arbitration and must be deleted:
`:108` ("uses REST when the flag is off"), `:131` ("uses REST when the room is
not connected"), `:232` ("uses REST for a session that has not finished
onboarding"). The other 3 (`:145`, `:164`, `:177`, `:205`) are the live-path
lifecycle and should be kept and *extended*. Also drop the `vi.stubEnv` harness
at `:99-105`.

### c.5 Config

`.env:4` and `.env.example:23` — remove `VITE_INTERVIEW_LK_TEXT=1`.
`.env.example` last, so a developer pulling mid-migration still gets a working
flag.

### c.6 Explicitly NOT deleted

`useInterviewChat`, `control-protocol.ts`, `chatBridge`, the whole transition /
end-confirmation / answer-state machinery, `sync_transcription` behaviour, and
the four polls in (e.7). The `chatBridge` ref (`use-interview-actions.ts:146`)
stays even though the branch is gone — the actions are still built outside the
provider (`types.ts:36-42`), so the ref is still the only way in.

---

## d) Rejoin / resume design

REST gave free retries: a failed POST is just a failed POST, and the session
lives on the server. A room join fails in ways REST never had — token mint,
signalling, dispatch, worker availability — and each needs its own surface.

### d.1 Failure modes and where each is already detectable

| Mode | Signal | Currently observed by |
|---|---|---|
| Token mint failed | `tokenError` | **nobody.** Set at `interview-room-provider.tsx:145`, `:176`, returned at `:281` — grep finds **zero readers**. A `toast.error` fires at `:181` for a non-warm mint and that is all. |
| Signal drop / reconnect | `room.state`, incl. `SignalReconnecting` | `use-interview-chat.ts:93-121`, subscribed at `:112` with the rationale at `:83-91`. Exposed as `connected` (`:294`). |
| In-flight turn cut off | connected → false | `use-interview-chat.ts:200-223`, resolves with `errorClass: "RoomDisconnected"`, `preserveDraft: true` (`:218`) |
| Control never arrives | 60s timeout | `use-interview-chat.ts:257-278`, `errorClass: "ControlTimeout"`, `preserveDraft: true` (`:275`) |
| Agent never dispatched | join deadline | `use-agent-join-watchdog.ts:14-56`, 25s (`agent-voice-presentation.ts:80`) |
| Agent joined then failed | `lk.agent.state === "failed"` | `agent-voice-presentation.ts:278`; both funnel into `use-agent-failure.ts:34-35` → one toast (`:41-48`) |
| Unexpected disconnect policy | `DisconnectReason` | `interview-room-provider.tsx:227-237`, filters `CLIENT_INITIATED` at `:230` |

### d.2 The one policy that must invert

`course-interview.tsx:145-151` passes `onUnexpectedDisconnect` **only** when
`iv.voiceActive`. The comment at `:142-144` says why: *"A drop while they are
typing is recoverable on its own: the text transport falls back to REST."* Once
REST is gone that rationale is void — a drop while typing is now a hard stop.
The same reasoning appears at `interview-room-provider.tsx:136-138`.

But it must **not** simply be pointed at `handleVoiceDropped`
(`interview-start-actions.ts:293-317`): that switches the session to text mode
(`:298`) and re-enters via the idempotent start path (`:311-314`) — which is
precisely the REST fallback wearing a different hat. For a text candidate the
correct behaviour is *rejoin the same room*, not *degrade the session*.

### d.3 What the candidate sees

**Room reconnecting, no turn in flight.** `chat.connected` false. Reuse
`ConnectionLostBanner` with `reconnecting` (`error-banner.tsx:124-159`, copy at
`recovery.reconnecting_title` / `_body`, reassurance
`recovery.progress_safe` = *"Your progress and current answer are safe."*).
Composer stays *editable* but Send is locked — add a fourth input to
`isComposerLocked` (`composer-lock.ts:28-45`) rather than unmounting the
composer, because unmounting would lose focus and caret. Hook point:
`InterviewWorkspaceScreen.tsx:218-224` already renders that banner off
`iv.connected` (browser online/offline, `use-interview-drafts.ts:74-83`); add a
sibling driven by `chat.connected`.

**Room drops mid-answer, turn in flight.** Already correct in the hook:
`use-interview-chat.ts:200-223` fails the turn with `preserveDraft: true`, so
`sendTurnViaLiveKit` hits `:332-337` → `submitFailed` + `setAnswerText(text)`
and `workspace-helpers.tsx:81-91` renders the failed card with Retry. What
changes: the message. `rejectionMessage` (`:299-311`) falls through to
`errors.send_failed_livekit` for both `RoomDisconnected` and `ControlTimeout`,
and those are different situations — one is *definitely not graded*, the other
is *ambiguous* (`use-interview-chat.ts:272-275`). Add two keys and branch on
`event.errorClass`.

**Token mint failed / agent never joined.** This is the genuinely new UX. Wire
`tokenError` for the first time: read it at
`InterviewWorkspaceScreen.tsx` via `useInterviewRoomState()` (already called at
`:56`) and render an `ErrorBanner` with a **Rejoin** action. The provider needs a
`retryToken()` — the mint effect is guarded by `tokenData || isFetchingToken`
(`:158`), so clearing `tokenData` and `tokenError` re-runs it. That is the same
recovery the dispatch-failure path already performs internally at `:210-212`.

**Draft survival.** Three layers, all already in place:

1. In-session: `submitFailed` + `setAnswerText(trimmed)`
   (`interview-answer-actions.ts:334-335`) puts the text straight back.
2. Across reload: `abridge:iv-draft:<sessionId>:<questionId>`
   (`use-draft-autosave.ts:22-31`), and `clearDraftAutosave` runs **only** after
   a successful commit (`interview-answer-actions.ts:77`) — so a failed turn's
   draft survives.
3. Idempotency: the retry reuses `retrySubmissionId`
   (`workspace-helpers.tsx:86-88` → `interview-answer-actions.ts:423`), which is
   the `turn_key` the agent dedupes on.

One real gap. Restore requires `answer.state.status === "draft"`
(`use-interview-drafts.ts:64`) and is one-shot per question id
(`:62-63`). After a *failed* turn the status is `failed`, so an in-session
re-restore is skipped — harmless today because layer 1 covers it, but it means
the restore path is untested against the new room-drop flow. Add a test rather
than code.

### d.4 Auto-rejoin, and the one thing not to do

`useLiveKitRoom` reconnects on its own; `connect` is `(active || warm) &&
Boolean(tokenData)` (`interview-room-provider.tsx:247`). So the room recovers
itself as long as the *token* is valid. Do **not** add a client-side rejoin loop
on top — two reconnect drivers on one room is how the warm-room clipping bug
happened (`agent-voice-presentation.ts:205-211`). Manual Rejoin should only
re-mint the token; the SDK owns the socket.

---

## e) Ordered migration steps

Each step is independently shippable and leaves `master` green.

### Step 1 — Remove the flag from the room predicates

Files: `routes/course-interview.tsx` (`:2`, `:57`, `:105`),
`InterviewWorkspaceScreen.tsx` (`:13`, `:57`).
`roomActive` becomes `sessionId && (voiceActive || (inputMode === "hybrid" &&
onboardingStage === "completed" && !pendingFirstQuestion))`.
Update the `flagOn` parameter out of
`__tests__/interview-room-activation.test.ts:25`, `:32`.

Verify: `npx vitest run src/routes/_components/course-interview/__tests__/interview-room-activation.test.ts`

### Step 2 — Collapse the transport branch

Files: `interview-answer-actions.ts`.
Delete `:433-451`, simplify `resolveSubmitGate` (`:358-375`) to a pending guard,
drop `agentWillSpeak` (`:222-228`, `:246-248`, `:348`) and
`resolveStandaloneText` (`:84-88`), re-source `RespondResult` (`:27-29`) from
`ControlTurnState`, merge `reportAnswerFailure` (`:195-213`) into
`rejectionMessage` (`:299-311`). Delete the 3 arbitration tests
(`interview-answer-transport.test.ts:108`, `:131`, `:232`) and the `stubEnv`
harness (`:99-105`).

Verify: `npx vitest run src/routes/_components/course-interview/__tests__/interview-answer-transport.test.ts && npx tsc --noEmit`

### Step 3 — Delete the two arbitration modules

Files: delete `lib/interview/text-transport.ts`,
`lib/interview/transport-reporter.ts`, and their two test files. Remove
`VITE_INTERVIEW_LK_TEXT` from `.env`, then `.env.example`.

Verify: `npx tsc --noEmit && npm run lint` (an orphaned import is a type error, so tsc is the real gate)

### Step 4 — Rejoin UX

Files: `interview-room-provider.tsx` (add `retryToken`),
`InterviewWorkspaceScreen.tsx` (read `tokenError`, render the banner off
`chat.connected`), `composer-lock.ts` (fourth input: `roomDown`),
`i18n/locales/*.json` (two new error keys, plus a rejoin label).

Verify: `npx vitest run src/components/interview/__tests__/setup-and-recovery.test.ts src/lib/interview/__tests__/composer-lock.test.ts`

### Step 5 — Invert the disconnect policy

Files: `routes/course-interview.tsx:145-151`. Pass a handler for the text path
that surfaces the rejoin banner — **not** `handleVoiceDropped`
(`interview-start-actions.ts:293-317`), which degrades the session to text-mode
REST. Update the stale comments at `:142-144` and
`interview-room-provider.tsx:136-138`.

Verify: `npx vitest run src/routes/_components/course-interview/__tests__/`

### Step 6 — Assistance onto `lk.chat` (needs backend first)

Files: `interview-assistance-actions.ts`, `use-interview-actions.ts:206-210`.
Today `sendTurn` is called with `turnAction: "answer"` hardcoded
(`interview-answer-actions.ts:327`) and `handleAssistance` posts REST
(`:102-108`). The transport is already capable — `sendTurn` takes any
`TurnAction` (`use-interview-chat.ts:51-57`) and `chatAttributes` serializes any
of them (`control-protocol.ts:275-283`); tests already send `hint`
(`use-interview-chat.test.ts:208`).

Two things block a mechanical port. `applyRespondResult` is **module-private**
(`interview-answer-actions.ts:215`) while assistance has its own render path
(`interview-assistance-actions.ts:29-53`) with different semantics: optimistic
append *before* send (`:91-99`) vs commit-after-ack, and rollback-on-failure
(`:60-62`) vs preserve-draft. And assistance turn keys are **non-idempotent** —
`newTurnKey()` fresh per attempt (`:107`), unlike answers (`:423`). Fix the key
first; it is a one-line change with real value even before the transport moves.

Verify: a new `interview-assistance-transport.test.ts` mirroring the surviving cases of step 2.

### Step 7 — Retire `useInterviewRespond`

Only after step 6, and only after `handleEndConfirm` / `handleEndCancel`
(`interview-assistance-actions.ts:142-187`) also move. Then delete
`interviews.ts:148-168`. **Onboarding's hook (`:170-186`) stays forever.**

Verify: `npx tsc --noEmit && npm run test:run`

### e.7 Which polls survive

| Poll | Location | Fate |
|---|---|---|
| Verdict, 3000ms | `use-interview-server-sync.ts:100-103`, gated by `verdictPollEnabled` (`interview-verdict.ts:53-58`) | **Survives.** Grading is async by design (evaluation ~13s, gap report ~31s) and post-session. Not a turn concern. |
| Completion, 2000ms | `use-interview-server-sync.ts:133-136`, gated by `pollingCompletion` | **Replaceable** by a pushed control event once `end_interview` is a server-authoritative tool. Set today only by `handleVoiceCompleted` (`interview-start-actions.ts:279`). Do this last — the async verdict still needs the 3s poll afterwards, so removing it saves one request, not the polling architecture. |
| Gap report, 3000ms + 60×404 retry | `interviews.ts:225-228` | **Survives** |
| Practice feedback, 3000ms | `interviews.ts:89-96`, `PRACTICE_FEEDBACK_POLL_MS` `:102` | **Survives** |

Pushed events replace *turn* round-trips, not *grading* round-trips. Only one of
the four polls is in scope, and it is the least valuable one.

### e.8 The onboarding → live-room handoff

This must survive every step above unchanged, because it is the most
delicately-sequenced part of the page. Onboarding runs REST
(`interview-onboarding-actions.ts:85-152`, endpoint `interviews.ts:170-186`).
On the turn where `is_complete` is true:

1. `setOnboardingStage("completed")` (`:125`)
2. a `kind: "transition"` ceremony turn is appended with `elapsedSeconds: 0`
   (`:51-63`, `:61`)
3. `startAssessmentFromOnboarding` (`:66-83`) anchors the clock (`:71-75`), the
   deadline (`:76-79`), then sets `pendingFirstQuestion` (`:81`) and
   `phase = "transition"` (`:82`)

That fans out to seven observers; two have side effects. `agentWanted`
(`course-interview.tsx:134-136`) fires `POST /realtime-agent` exactly once
(`interview-room-provider.tsx:200-216`), and only for a *warm*-minted token
(`:202`). `pendingFirstQuestion` is cleared by `useTurnPresentedHandler`
(`use-interview-sequencing.ts:52-66`), which is what reveals question one.

The load-bearing subtlety: `pendingFirstQuestion` also keeps
`resolveAgentOwnsTheVoice` false (`agent-voice-presentation.ts:193`) so the
client can narrate the transition line — which is REST-authored text the agent
never receives (`course-interview.tsx:40-48`,
`agent-voice-presentation.ts:180-193`). And `shouldWarmRoom` deliberately stays
true through that same beat (`agent-voice-presentation.ts:215-224`, `:223`) so
`connect` does not drop and re-establish mid-utterance, which clipped the
opening syllables (`:205-211`).

Nothing in steps 1-7 touches this. It is documented here so it is not
"simplified" by someone who reads `livekitTextEnabled()` leaving
`course-interview.tsx:57` as licence to flatten the predicate.

### e.9 What cannot be decided from the frontend

1. **`time_remaining_seconds` in a streaming world.** Which channel, and at what
   cadence? Absence is currently indistinguishable from "no time limit"
   (`use-interview-drafts.ts:103-106`). If the state reminder carries it, does it
   need an explicit `has_time_limit` so the two cases separate?
2. **Refusal to advance.** `next_question` refused-until-covered has no client
   representation. `TurnRejection` (`control-protocol.ts:79-85`) is all
   validation errors; misusing it would preserve the draft for a turn that *was*
   graded. New status, or `completed` with a null `next_question`?
3. **End-confirmation prompt ownership.** Does the agent voice it (audio only,
   panel shows static copy) or not (control carries `ai_turn_text`)? Today both
   happen — see b.3.
4. **Assistance turn semantics on the wire.** Does a `hint` turn produce a
   `completed` control event with a full `state`, or a lighter shape? The client
   render paths differ materially (`interview-assistance-actions.ts:29-53` vs
   `interview-answer-actions.ts:215-289`).
5. **`is_finished` vs `should_finish`.** Two fields, one decision, `??`-merged at
   three sites. Which survives?
6. **Pure-text configs.** `supported_modes === "text"` is a real config value
   (`use-interview-speech.ts:39`) and such a session never joins a room. Does it
   get one, or does REST `/respond` stay alive for it? This is the single
   biggest open question and it is a *product* decision — see R6.
7. **Does the agent need a `text_only` mode?** A typing candidate holds the room
   with `audio: false` (`course-interview.tsx:140`). Should the agent still run
   TTS for them? Today it does, which is why `agentWillSpeak` exists.

---

## f) Risk register

**R1 — `time_remaining_seconds` stops arriving; the timer dies silently.**
*Candidate experience:* a timed interview never auto-closes. They keep answering
past the limit, then the server rejects or grades a session that ran long.
Nothing on screen ever warns them.
*Why it is likely:* `reconcileDeadline` returns early on null
(`use-interview-drafts.ts:106`) and `useInterviewTimeout` bails on a null
deadline (`use-interview-sequencing.ts:127-135`). Both are silent by design.
*Mitigation:* make it a contract requirement on the state reminder before step 2
ships. Add a dev-only assertion when `phase === "questioning"` and the deadline
is null while `config.time_limit_minutes` is set — that pair is always a bug.

**R2 — Refusal to advance renders as a submission failure.**
*Candidate experience:* they answer, the agent declines to move on (correctly),
and the UI tells them the send failed and re-shows their answer in the composer.
They resend the same text. Possibly repeatedly.
*Mitigation:* resolve open question (2) before step 2. Until then, ensure any
unmapped status falls through `rejectionMessage`'s default (`:308-309`) to a
neutral "still on this question" message rather than "could not be sent".

**R3 — Room drop with no fallback strands the candidate mid-interview.**
*Candidate experience:* Send does nothing, or spins 60s
(`use-interview-chat.ts:74`) and reports a failure. Today REST silently caught
this (`text-transport.ts:84-86`).
*Mitigation:* steps 4 and 5 are not optional polish — they are what replaces the
fallback. Do not ship step 3 without step 4. The draft is already safe
(three layers, d.3); it is the *lack of a visible next action* that harms.

**R4 — Token mint fails and nothing says so.**
*Candidate experience:* a text-mode candidate sits in a workspace whose Send
never works, with one toast (`interview-room-provider.tsx:181`) that may already
have dismissed itself.
*Why:* `tokenError` has zero readers, verified.
*Mitigation:* step 4 wires it, with an explicit Rejoin. Cheapest high-value item
in this plan.

**R5 — Duplicate agent speech in the end-confirmation panel.**
*Candidate experience:* the confirmation question appears in the panel and is
spoken over it, slightly differently worded.
*Why:* the suppression at `:246-248` sits *after* the early return at `:235-238`.
*Mitigation:* open question (3). Cheap interim fix: apply the same
`agentWillSpeak` suppression to `endConfirmationPrompt` and fall back to the
localized `end_confirm.prompt` (`interview-answer-actions.ts:46`).

**R6 — Pure-text configs lose their transport.**
*Candidate experience:* a `supported_modes: "text"` interview cannot submit
anything at all — no room was ever opened for it
(`text-transport.ts:35-36`, `use-interview-speech.ts:39`).
*Mitigation:* decide open question (6) **before step 3**. Either such configs
also get a room (and the agent gets a no-TTS mode — open question 7), or
`/respond` survives for them and the "full cutover" is narrower than stated.
This is the item most likely to be discovered late.

**R7 — "REST as a fallback transport is one brain with two doors."**
The owner's decision is full cutover, no permanent dual-path brain. Worth
recording the counter-argument, because the code already supports it: on the
live path the control payload *is* the REST response body, byte-for-byte
(`control-protocol.ts:87-100`), produced by the same `from_step_result`. Once
the agent owns `chat_ctx` and the tools are server-authoritative, a REST call
that invokes the *same* tools against the *same* context is not a second brain —
it is a second door. The thing worth deleting is the *arbitration*
(`text-transport.ts`, `transport-reporter.ts`) and the divergent
`applyRespondResult`-vs-`appendAssistanceTurns` render paths, not necessarily
the HTTP endpoint. Deleting the endpoint too is a defensible simplification; it
just should not be justified by "two brains", because after the backend work it
is one.

**R8 — Two `presentedAiTurnIds` sets drift.**
*Candidate experience:* a question the interviewer has not finished reading
appears in full in the docked transcript, or a card never releases its
typewriter.
*Why:* independent sets at `use-interview-phase-state.ts:63-65` and
`use-focused-stage-turns.ts:48-50`, with the rationale for the split at
`use-interview-phase-state.ts:59-62`.
*Mitigation:* pre-existing, not caused by this migration. Do not consolidate
during it — the split is deliberate. Note it and leave it.

**R9 — `closingCeremonyActive` never resets.**
*Candidate experience:* the wrap-up bar with Skip-and-finish
(`WorkspaceInputArea.tsx:36-54`) stays visible for the rest of the session once
a closing sub-step has occurred.
*Why:* set `true` at `interview-answer-actions.ts:111`, never set `false`
anywhere.
*Mitigation:* pre-existing. Fix it separately with its own test; porting the
latch onto a new transport would launder a bug as a migration decision.

**R10 — Lost cache invalidation during questioning.**
*Candidate experience:* none today. A stale `interviews.session` cache entry
during questioning, where nothing reads it.
*Why:* the mutation's `onSuccess` (`interviews.ts:160-167`) does not exist on
the live path; the two `use-interview-server-sync.ts` polls are gated off during
questioning (`:101`, `:134`).
*Mitigation:* record it. If anything later reads session state mid-interview, it
must invalidate from the control-event handler instead.
