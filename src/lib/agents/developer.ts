import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { DEVELOPER_SYSTEM_PROMPT } from '../prompts';

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

// ── Build a concise v0 prompt from full specs ──
async function buildV0Prompt(specs: DevSpecs): Promise<string> {
  // Use Gemini to distill the full specs into a concise v0 build prompt
  const { text } = await generateText({
    model: google('gemini-3-flash-preview'),
    system: `You are a prompt engineer. Distill complex product specs into a concise Next.js app build prompt for v0.
Output a SHORT prompt (under 2000 chars) that tells v0 exactly what to build. Include:
1. App name and one-sentence description
2. The EXACT /api/agent route code (using @google/genai SDK)
3. UI: what pages, what the main input/output looks like
4. No integrations, no Supabase, no Stripe`,
    prompt: `Distill these specs into a concise v0 build prompt:

COMPANY: ${specs.companyBrief.substring(0, 500)}
PRODUCT FEATURES: ${specs.prd.substring(0, 800)}
ARCHITECTURE: ${specs.architectureDoc.substring(0, 800)}

The /api/agent route MUST use this pattern:
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
// Then: ai.models.generateContent({ model: 'gemini-3.1-pro-preview', contents: ..., config: { tools: [{ googleSearch: {} }] } })

Generate a prompt under 2000 characters. Include the EXACT API route code.`,
  });
  return text;
}

// ── Developer Agent ──

export async function runDeveloperAgent(specs: DevSpecs): Promise<DevResult> {
  try {
    // Primary: v0 SDK
    const { v0 } = await import('v0-sdk');

    // Pass env vars
    const envVars: { key: string; value: string }[] = [
      { key: 'GOOGLE_GENERATIVE_AI_API_KEY', value: process.env.GOOGLE_GENERATIVE_AI_API_KEY! },
    ];
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      envVars.push({ key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL });
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      envVars.push({ key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
    }
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      envVars.push({ key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY });
    }

    const project = await v0.projects.create({
      name: 'foundersim-gen',
      environmentVariables: envVars,
    });

    // Build concise prompt (Gemini distills the full specs)
    const v0Prompt = await buildV0Prompt(specs);

    const v0WithTimeout = async <T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('v0_timeout')), timeoutMs)),
      ]);
    };

    let chat;
    try {
      chat = await v0WithTimeout(() => v0.chats.create({
        projectId: project.id,
        message: v0Prompt + `\n\nRULES: No integrations. No Supabase/Stripe via v0. Use npm packages + env vars. Model MUST be gemini-3.1-pro-preview. Use @google/genai SDK. Standard app/ directory structure.`,
        system: 'Build a Next.js 15 app. Use the exact API route code provided. No integrations.',
      }), 150000); // 150s timeout
    } catch (timeoutErr) {
      if (timeoutErr instanceof Error && timeoutErr.message === 'v0_timeout') {
        console.warn('v0 timed out. Trying restart...');
        try {
          chat = await v0WithTimeout(() => v0.chats.create({
            projectId: project.id,
            message: 'Skip all integrations. Complete the build with npm packages and env vars only.',
            system: 'Complete the build. No integrations.',
          }), 90000);
        } catch {
          throw new Error('v0 timed out — falling back to Gemini');
        }
      } else {
        throw timeoutErr;
      }
    }

    const chatData = chat as Record<string, unknown>;
    const latestVersion = chatData.latestVersion as Record<string, unknown> | undefined;
    const fileCount = (latestVersion?.files as unknown[])?.length || 0;

    // Auto-deploy
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

    return {
      summary: `Generated ${fileCount} files via v0`,
      demoUrl: (latestVersion?.demoUrl as string) || null,
      webUrl: (chatData.webUrl as string) || null,
      v0ChatId: (chatData.id as string) || undefined,
      v0ProjectId: (chatData.projectId as string) || undefined,
    };
  } catch (err) {
    console.error('v0 SDK failed, falling back to Gemini:', err);
    // Fallback: Gemini direct code gen
    const allSpecs = `Company: ${specs.companyBrief.substring(0, 500)}\nPRD: ${specs.prd.substring(0, 1000)}\nArchitecture: ${specs.architectureDoc.substring(0, 1000)}`;
    const { text } = await generateText({
      model: google('gemini-3.1-pro-preview'),
      system: DEVELOPER_SYSTEM_PROMPT,
      maxOutputTokens: 32000,
      prompt: `Generate a Next.js 15 app. ${allSpecs}\n\nOutput each file as:\n### FILE: src/app/page.tsx\n\`\`\`tsx\ncode\n\`\`\``,
    });
    return { summary: 'Generated via Gemini fallback', demoUrl: null, webUrl: null, rawCode: text };
  }
}
