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
  v0ChatId?: string;
  v0ProjectId?: string;
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
    const project = await v0.projects.create({
      name: 'foundersim-gen',
      environmentVariables: [
        { key: 'GOOGLE_GENERATIVE_AI_API_KEY', value: process.env.GOOGLE_GENERATIVE_AI_API_KEY! },
      ],
    });
    const chat = await v0.chats.create({
      projectId: project.id,
      message: taskPrompt + `\n\nCRITICAL BUILD RULES:
- Do NOT add Supabase integration or Stripe integration via v0's integration system. Instead, use @supabase/supabase-js directly with environment variables.
- Do NOT prompt for any integrations. Use plain npm packages and env vars for all external services.
- The app must build and deploy without any manual intervention or integration approvals.
- For the /api/agent endpoint: use @google/genai SDK directly, NOT the Vercel AI SDK, NOT ai-gateway.vercel.sh.
- Import: import { GoogleGenAI } from '@google/genai';
- Initialize: const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
- Call: ai.models.generateContent({ model: 'gemini-3.1-pro-preview', contents: '...', config: { tools: [{ googleSearch: {} }, { urlContext: {} }] } })
- Add @google/genai to dependencies.
- The GOOGLE_GENERATIVE_AI_API_KEY env var is already set in Vercel.
- NEVER use Vercel AI Gateway (ai-gateway.vercel.sh) — it will cause server errors.`,
      system: DEVELOPER_SYSTEM_PROMPT,
    });
    const chatData = chat as Record<string, unknown>;
    const latestVersion = chatData.latestVersion as Record<string, unknown> | undefined;
    const fileCount = (latestVersion?.files as unknown[])?.length || 0;

    // Auto-deploy: try to create a deployment from the chat
    if (latestVersion?.id && chatData.id && chatData.projectId) {
      try {
        const deployment = await v0.deployments.create({
          projectId: chatData.projectId as string,
          chatId: chatData.id as string,
          versionId: latestVersion.id as string,
        });
        const deployData = deployment as unknown as Record<string, unknown>;
        if (deployData.webUrl) {
          return {
            summary: `Generated ${fileCount} files and deployed via v0`,
            demoUrl: deployData.webUrl as string,
            webUrl: (chatData.webUrl as string) || null,
            v0ChatId: (chatData.id as string) || undefined,
            v0ProjectId: (chatData.projectId as string) || undefined,
          };
        }
      } catch (deployErr) {
        console.error('v0 auto-deploy failed:', deployErr);
      }
    }

    // Fall through if deployment failed or missing required IDs
    return {
      summary: `Generated ${fileCount} files via v0`,
      demoUrl: (latestVersion?.demoUrl as string) || null,
      webUrl: (chatData.webUrl as string) || null,
      v0ChatId: (chatData.id as string) || undefined,
      v0ProjectId: (chatData.projectId as string) || undefined,
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
