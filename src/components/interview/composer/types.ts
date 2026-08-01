/**
 * Which input surface the candidate is answering with. Alias for the literal
 * union the composers already used inline, so the mode toggle, the voice panel
 * and `FocusedAnswerComposer` all name the same thing.
 */
export type AnswerMode = "voice" | "type";
