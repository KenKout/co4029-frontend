export const QUESTION_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
  { value: "fill_blank", label: "Fill in the blank" },
] as const;

export const BLOOM_OPTIONS = [
  { value: "", label: "Any Bloom" },
  { value: "remember", label: "Remember" },
  { value: "understand", label: "Understand" },
  { value: "apply", label: "Apply" },
  { value: "analyze", label: "Analyze" },
  { value: "evaluate", label: "Evaluate" },
  { value: "create", label: "Create" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "", label: "Any difficulty" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export const REVIEW_STATUS_OPTIONS = [
  { value: "approved", label: "Approved only" },
  { value: "pending", label: "Pending review" },
  { value: "edited", label: "Edited" },
  { value: "", label: "All states" },
] as const;
