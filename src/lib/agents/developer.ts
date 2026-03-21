import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { DEVELOPER_SYSTEM_PROMPT, buildDeveloperTaskPrompt } from '../prompts';

// ── Types ──

export interface DevSpecs {
  companyBrief: string;
  competitiveAnalysis: string;
  prd: string;
  architectureDoc: string;
}

export interface DevResult {
  summary: string;
  demoUrl: string | null;
  webUrl: string | null;
  rawCode?: string;
  agentEndpoint?: {
    route: string;
    inputExample: Record<string, unknown>;
    outputExample: Record<string, unknown>;
  };
}

// ── Developer Agent ──

export async function runDeveloperAgent(specs: DevSpecs): Promise<DevResult> {
  const taskPrompt = buildDeveloperTaskPrompt(specs.companyBrief, specs.competitiveAnalysis, specs.prd, specs.architectureDoc);

  try {
    // Primary: v0 SDK
    const { v0 } = await import('v0-sdk');
    const project = await v0.projects.create({ name: 'foundersim-gen' });
    const chat = await v0.chats.create({
      projectId: project.id,
      message: taskPrompt + `\n\nCRITICAL BUILD RULES:
- Do NOT add Supabase integration or Stripe integration via v0's integration system. Instead, use @supabase/supabase-js directly with environment variables.
- Do NOT prompt for any integrations. Use plain npm packages and env vars for all external services.
- The app must build and deploy without any manual intervention or integration approvals.
- Use fetch() or SDK clients directly — never rely on v0 platform integrations.`,
      system: DEVELOPER_SYSTEM_PROMPT,
    });
    const chatData = chat as Record<string, unknown>;
    const latestVersion = chatData.latestVersion as Record<string, unknown> | undefined;
    return {
      summary: `Generated ${(latestVersion?.files as unknown[])?.length || 0} files via v0`,
      demoUrl: (latestVersion?.demoUrl as string) || null,
      webUrl: (chatData.webUrl as string) || null,
    };
  } catch (err) {
    console.error('v0 SDK failed, falling back to Gemini:', err);
    // Fallback: Gemini 3.1 Pro direct code gen
    const { text } = await generateText({
      model: google('gemini-3.1-pro-preview'),
      system: DEVELOPER_SYSTEM_PROMPT,
      maxOutputTokens: 32000,
      prompt: `${taskPrompt}\n\nOutput each file as:\n### FILE: src/app/page.tsx\n\`\`\`tsx\ncode here\n\`\`\``,
    });
    return { summary: 'Generated via Gemini fallback', demoUrl: null, webUrl: null, rawCode: text };
  }
}
