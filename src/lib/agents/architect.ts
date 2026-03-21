import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { ARCHITECT_SYSTEM_PROMPT, buildArchitectTaskPrompt } from '../prompts';

// ── Structured Output Schema ──

export const ArchitectOutputSchema = z.object({
  techStack: z.array(z.object({
    layer: z.string().describe('e.g. Frontend, Backend, Database, Auth, Hosting, AI'),
    choice: z.string(),
    rationale: z.string(),
  })),
  agentEndpoint: z.object({
    route: z.string().describe('e.g. POST /api/agent'),
    inputSchema: z.string().describe('TypeScript interface for input JSON'),
    outputSchema: z.string().describe('TypeScript interface for output JSON'),
    pipeline: z.array(z.string()).describe('Step-by-step processing inside the endpoint'),
    errorCases: z.array(z.string()),
  }),
  mermaidDiagram: z.string().describe('Mermaid flowchart code'),
  dataModel: z.string().describe('SQL CREATE TABLE statements or "No database required"'),
  adrs: z.array(z.object({
    decision: z.string(),
    alternatives: z.array(z.string()),
    rationale: z.string(),
    risk: z.string(),
    reversibility: z.enum(['easy', 'medium', 'hard']),
  })),
  componentTree: z.array(z.object({
    route: z.string(),
    components: z.array(z.string()),
  })),
});

export type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>;

// ── Markdown Conversion Helper ──

export function architectOutputToMarkdown(output: ArchitectOutput): string {
  const sections: string[] = [];

  // Tech Stack
  sections.push('## Tech Stack\n');
  sections.push('| Layer | Choice | Rationale |');
  sections.push('|-------|--------|-----------|');
  for (const item of output.techStack) {
    sections.push(`| ${item.layer} | ${item.choice} | ${item.rationale} |`);
  }

  // Agent Endpoint
  sections.push('\n## Agent Endpoint\n');
  sections.push(`**Route:** \`${output.agentEndpoint.route}\`\n`);
  sections.push('### Input Schema\n');
  sections.push('```typescript');
  sections.push(output.agentEndpoint.inputSchema);
  sections.push('```\n');
  sections.push('### Output Schema\n');
  sections.push('```typescript');
  sections.push(output.agentEndpoint.outputSchema);
  sections.push('```\n');
  sections.push('### Processing Pipeline\n');
  for (let i = 0; i < output.agentEndpoint.pipeline.length; i++) {
    sections.push(`${i + 1}. ${output.agentEndpoint.pipeline[i]}`);
  }
  sections.push('\n### Error Cases\n');
  for (const errorCase of output.agentEndpoint.errorCases) {
    sections.push(`- ${errorCase}`);
  }

  // Mermaid Diagram
  sections.push('\n## System Diagram\n');
  sections.push('```mermaid');
  sections.push(output.mermaidDiagram);
  sections.push('```');

  // Data Model
  sections.push('\n## Data Model\n');
  if (output.dataModel.toLowerCase().includes('no database')) {
    sections.push(output.dataModel);
  } else {
    sections.push('```sql');
    sections.push(output.dataModel);
    sections.push('```');
  }

  // ADRs
  sections.push('\n## Architecture Decision Records\n');
  for (const adr of output.adrs) {
    sections.push(`### ${adr.decision}\n`);
    sections.push(`**Alternatives:** ${adr.alternatives.join(', ')}  `);
    sections.push(`**Rationale:** ${adr.rationale}  `);
    sections.push(`**Risk:** ${adr.risk}  `);
    sections.push(`**Reversibility:** ${adr.reversibility}\n`);
  }

  // Component Tree
  sections.push('## Component Tree\n');
  for (const route of output.componentTree) {
    sections.push(`### \`${route.route}\`\n`);
    for (const component of route.components) {
      sections.push(`- ${component}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

// ── Original Agent (string output, backward compatible) ──

export async function runArchitectAgent(brief: string, research: string, prd: string): Promise<string> {
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseContext = hasSupabase
    ? '\n\nNote: Supabase credentials are available. Use Supabase for database, auth, and real-time features.'
    : '';

  const { text } = await generateText({
    model: google('gemini-3.1-pro-preview'),
    system: ARCHITECT_SYSTEM_PROMPT + supabaseContext,
    prompt: buildArchitectTaskPrompt(brief, research, prd),
  });
  return text;
}

// ── Structured Agent (typed output + markdown) ──

export async function runArchitectAgentStructured(
  brief: string,
  research: string,
  prd: string
): Promise<{ structured: ArchitectOutput; markdown: string }> {
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseContext = hasSupabase
    ? '\n\nNote: Supabase credentials are available. Use Supabase for database, auth, and real-time features.'
    : '';

  const { object } = await generateObject({
    model: google('gemini-3.1-pro-preview'),
    schema: ArchitectOutputSchema,
    system: ARCHITECT_SYSTEM_PROMPT + supabaseContext,
    prompt: buildArchitectTaskPrompt(brief, research, prd),
  });

  const markdown = architectOutputToMarkdown(object);
  return { structured: object, markdown };
}
