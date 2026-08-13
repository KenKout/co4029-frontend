import { EMPTY_BLOOM_DISTRIBUTION } from "../quiz-generation-form-controls";
import type { FormState, QuestionType } from "./types";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  short_answer: "Short answer",
  fill_blank: "Fill in the blank",
  numerical: "Numerical",
  matching: "Matching",
  ordering: "Ordering",
};

export const INITIAL_FORM: FormState = {
  question_count: 5,
  difficulty: "medium",
  expected_response_seconds: 60,
  question_types: ["multiple_choice"],
  generation_mode: "topic",
  focus_topics: [],
  avoid_topics: [],
  extra_instructions: "",
  append: false,
  coverage_min_per_section: 1,
  coverage_max_per_section: 5,
  skip_summaries: true,
  slides_per_section: 4,
  section_grouping: "auto",
  selected_section_ids: {},
  bloom_enabled: false,
  bloom_distribution: { ...EMPTY_BLOOM_DISTRIBUTION },
  target_outcome_ids: [],
};
