import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { PRODUCT_SYSTEM_PROMPT, buildProductTaskPrompt } from '../prompts';

// ── Zod Schema for Structured Output ──

export const ProductOutputSchema = z.object({
  jobToBeDone: z.string().describe('The core job the user is hiring this product to do'),
  killerFeature: z.string().describe('The ONE thing better than every competitor, in 8 words or fewer'),
  features: z.array(z.object({
    name: z.string(),
    userStory: z.string(),
    acceptanceCriteria: z.array(z.string()),
    priority: z.enum(['P0', 'P1']),
    rationale: z.string().describe('Why this feature, traced to competitive gap'),
  })).max(5),
  cutList: z.array(z.object({
    feature: z.string(),
    whyTempting: z.string(),
    whyCut: z.string(),
    reconsiderWhen: z.string(),
  })),
  metrics: z.object({
    primary: z.string().describe('ONE number with 90-day target'),
    secondary: z.array(z.string()),
    antiMetric: z.string().describe('What we are NOT optimizing for'),
  }),
});

export type ProductOutput = z.infer<typeof ProductOutputSchema>;

// ── Markdown Conversion ──

/**
 * Convert a structured ProductOutput into readable markdown for the InspectorPanel
 * and other UI surfaces that render markdown.
 */
export function productOutputToMarkdown(output: ProductOutput): string {
  const lines: string[] = [];

  lines.push('## Jobs to Be Done');
  lines.push('');
  lines.push(output.jobToBeDone);
  lines.push('');

  lines.push('## Killer Feature');
  lines.push('');
  lines.push(`**${output.killerFeature}**`);
  lines.push('');

  lines.push('## MVP Features');
  lines.push('');
  for (const feature of output.features) {
    lines.push(`### ${feature.name} (${feature.priority})`);
    lines.push('');
    lines.push(`**User Story:** ${feature.userStory}`);
    lines.push('');
    lines.push('**Acceptance Criteria:**');
    for (const criterion of feature.acceptanceCriteria) {
      lines.push(`- ${criterion}`);
    }
    lines.push('');
    lines.push(`**Rationale:** ${feature.rationale}`);
    lines.push('');
  }

  lines.push('## Cut List');
  lines.push('');
  lines.push('| Feature | Why Tempting | Why Cut | Reconsider When |');
  lines.push('| --- | --- | --- | --- |');
  for (const item of output.cutList) {
    lines.push(`| ${item.feature} | ${item.whyTempting} | ${item.whyCut} | ${item.reconsiderWhen} |`);
  }
  lines.push('');

  lines.push('## Success Metrics');
  lines.push('');
  lines.push(`**Primary Metric:** ${output.metrics.primary}`);
  lines.push('');
  if (output.metrics.secondary.length > 0) {
    lines.push('**Secondary Metrics:**');
    for (const metric of output.metrics.secondary) {
      lines.push(`- ${metric}`);
    }
    lines.push('');
  }
  lines.push(`**Anti-Metric:** ${output.metrics.antiMetric}`);
  lines.push('');

  return lines.join('\n');
}

// ── Agent Functions ──

/**
 * Run the Product Agent and return markdown output (backward-compatible).
 * Used by the simulation pipeline SSE route.
 *
 * Tries structured generation first (generateObject), falls back to
 * free-form text generation (generateText) if structured generation fails.
 */
export async function runProductAgent(brief: string, research: string): Promise<string> {
  try {
    const { object } = await generateObject({
      model: google('gemini-3.1-pro-preview'),
      system: PRODUCT_SYSTEM_PROMPT,
      prompt: buildProductTaskPrompt(brief, research),
      schema: ProductOutputSchema,
    });
    return productOutputToMarkdown(object);
  } catch (err) {
    console.warn('Structured product generation failed, falling back to generateText:', err);
    const { text } = await generateText({
      model: google('gemini-3.1-pro-preview'),
      system: PRODUCT_SYSTEM_PROMPT,
      prompt: buildProductTaskPrompt(brief, research),
    });
    return text;
  }
}

/**
 * Run the Product Agent and return both the structured object and markdown.
 * Used by the standalone /api/agents/product API route for typed JSON responses.
 */
export async function runProductAgentStructured(
  brief: string,
  research: string,
): Promise<{ structured: ProductOutput; markdown: string }> {
  const { object } = await generateObject({
    model: google('gemini-3.1-pro-preview'),
    system: PRODUCT_SYSTEM_PROMPT,
    prompt: buildProductTaskPrompt(brief, research),
    schema: ProductOutputSchema,
  });
  return {
    structured: object,
    markdown: productOutputToMarkdown(object),
  };
}
