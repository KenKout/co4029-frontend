import { MessageSquare, Tag, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

import {
  BloomDistributionInput,
  CoverageOptionsForm,
  TopicTagInput,
} from "../quiz-generation-form-controls";
import type { QuizGenerationController } from "./use-quiz-generation-panel";

function ExtraInstructionsField({
  controller,
}: {
  controller: QuizGenerationController;
}) {
  const { form, setForm } = controller;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Extra instructions
      </label>
      <Textarea
        value={form.extra_instructions}
        onChange={(e) =>
          setForm((current) => ({
            ...current,
            extra_instructions: e.target.value,
          }))
        }
        rows={3}
        maxLength={1000}
        placeholder="Any extra constraints for the generator (style, audience, prior knowledge…)."
        variant="lowest"
      />
      <p className="text-[10px] text-m3-on-surface-variant text-right">
        {form.extra_instructions.length}/1000
      </p>
    </div>
  );
}

/**
 * Advanced personalisation disclosure: focus/avoid topic tags, free-text
 * instructions, the coverage knobs (coverage mode only) and the Bloom
 * distribution.
 */
export function AdvancedPersonalisation({
  controller,
}: {
  controller: QuizGenerationController;
}) {
  const { form, setForm, isCoverageMode, bloomOverflow, patchForm } =
    controller;
  return (
    <div className="space-y-4 rounded-xl border border-m3-outline-variant/20 bg-m3-surface p-4">
      <TopicTagInput
        label="Focus topics"
        hint="The generator will lean toward these topics. Up to 10 entries, 200 chars each."
        icon={Tag}
        values={form.focus_topics}
        onChange={(values) =>
          setForm((current) => ({ ...current, focus_topics: values }))
        }
      />

      <TopicTagInput
        label="Avoid topics"
        hint="The generator will steer clear of these topics."
        icon={X}
        values={form.avoid_topics}
        onChange={(values) =>
          setForm((current) => ({ ...current, avoid_topics: values }))
        }
      />

      <ExtraInstructionsField controller={controller} />

      {isCoverageMode && (
        <CoverageOptionsForm
          minPerSection={form.coverage_min_per_section}
          maxPerSection={form.coverage_max_per_section}
          skipSummaries={form.skip_summaries}
          slidesPerSection={form.slides_per_section}
          sectionGrouping={form.section_grouping}
          onChange={patchForm}
        />
      )}

      <BloomDistributionInput
        enabled={form.bloom_enabled}
        distribution={form.bloom_distribution}
        questionCount={form.question_count}
        overflow={bloomOverflow}
        onToggle={(enabled) =>
          setForm((current) => ({ ...current, bloom_enabled: enabled }))
        }
        onChange={(distribution) =>
          setForm((current) => ({
            ...current,
            bloom_distribution: distribution,
          }))
        }
      />
    </div>
  );
}
