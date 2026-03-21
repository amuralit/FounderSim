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
    // Pass ALL env vars so the generated app works without manual setup
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
    // Wrap v0 call with timeout — if it hangs (integration prompt), retry
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
      message: taskPrompt + `\n\nCRITICAL BUILD RULES:
- ABSOLUTELY DO NOT use v0 integrations for Supabase, Stripe, or any service. NO integration prompts. NO "Install" buttons. The app MUST build without ANY human interaction.
- For Supabase: import { createClient } from '@supabase/supabase-js' and use process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY directly. These env vars are ALREADY SET.
- For any database needs: use @supabase/supabase-js npm package with env vars. NEVER use v0's Supabase integration.
- The build MUST complete autonomously. If you add any integration that requires user approval, the build will timeout and fail.
- For the /api/agent endpoint: use @google/genai SDK directly, NOT the Vercel AI SDK, NOT ai-gateway.vercel.sh.
- Import: import { GoogleGenAI } from '@google/genai';
- Initialize: const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
- Call: ai.models.generateContent({ model: 'gemini-3.1-pro-preview', contents: '...', config: { tools: [{ googleSearch: {} }, { urlContext: {} }] } })
- IMPORTANT: The model ID MUST be 'gemini-3.1-pro-preview' (NOT gemini-2.0-flash, NOT gemini-1.5-flash, NOT gemini-pro — those are DEPRECATED and will return 404 errors)
- Add @google/genai to dependencies.
- The GOOGLE_GENERATIVE_AI_API_KEY env var is already set in Vercel.
- NEVER use Vercel AI Gateway (ai-gateway.vercel.sh) — it will cause server errors.
- NEVER use deprecated models (gemini-2.0-flash, gemini-1.5-flash, gemini-pro) — they return 404.
- Use standard Next.js App Router structure: app/ directory at root or src/app/. Do NOT put files in non-standard locations.`,
        system: DEVELOPER_SYSTEM_PROMPT,
      }), 120000); // 120s timeout
    } catch (timeoutErr) {
      if (timeoutErr instanceof Error && timeoutErr.message === 'v0_timeout') {
        console.warn('v0 build timed out. Sending restart message...');
        // Try to restart by sending a follow-up message to skip integrations
        try {
          const restartChat = await v0WithTimeout(() => v0.chats.create({
            projectId: project.id,
            message: 'The previous build timed out. Skip ALL integrations. Do NOT add Supabase or Stripe integrations. Use @supabase/supabase-js and @google/genai as npm packages with process.env vars. Continue building the app. Complete all remaining tasks.',
            system: 'Skip all integrations. Use npm packages with env vars. Complete the build.',
          }), 90000);
          const restartData = restartChat as Record<string, unknown>;
          const restartVersion = restartData.latestVersion as Record<string, unknown> | undefined;
          if (restartVersion) {
            chat = restartChat;
          } else {
            throw new Error('Restart did not produce a version');
          }
        } catch {
          console.warn('v0 restart also failed. Falling back to Gemini.');
          throw new Error('v0 timed out — falling back to Gemini code gen');
        }
      } else {
        throw timeoutErr;
      }
    }
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
