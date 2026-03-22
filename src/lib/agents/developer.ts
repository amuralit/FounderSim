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
function buildV0Prompt(specs: DevSpecs): string {
  // Extract key info from specs
  const missionMatch = specs.companyBrief.match(/Mission[:\s]*([^\n]+)/i);
  const mission = missionMatch?.[1]?.trim() || 'AI-powered research tool';
  const wedgeMatch = specs.companyBrief.match(/Wedge Product[:\s]*([^\n]+)/i);
  const wedge = wedgeMatch?.[1]?.trim() || 'A web app with search input and AI results';

  return `Build a Next.js 15 app: ${mission}

Product: ${wedge}

The app has:
1. A landing page (/) with a search/input area and results display
2. An /api/agent route that does the AI work

EXACT /api/agent/route.ts code — use this VERBATIM:
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = body.query || body.ticker || body.url || body.input || '';
    if (!input) return NextResponse.json({ error: 'input required' }, { status: 400 });

    const res = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: 'Analyze: ' + input + '. ${mission}. Return detailed JSON with your analysis.',
      config: { tools: [{ googleSearch: {} }] },
    });

    const text = res.text || '';
    try {
      const match = text.match(/\\{[\\s\\S]*\\}/);
      if (match) return NextResponse.json(JSON.parse(match[0]));
    } catch {}
    return NextResponse.json({ result: text.substring(0, 2000) });
  } catch (e) {
    return NextResponse.json({ error: String(e).substring(0, 200) }, { status: 500 });
  }
}
\`\`\`

UI requirements from PRD:
${specs.prd.substring(0, 600)}

CRITICAL UI RULE: The /api/agent returns structured JSON. The page.tsx MUST parse and render it as beautiful cards — NOT raw JSON. Use sections, headers, colored badges, bullet lists, and cards for each part of the response. Never show raw JSON to the user.

Use shadcn/ui components. Let v0 choose the best design.`;
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

    let chatData = chat as Record<string, unknown>;
    let latestVersion = chatData.latestVersion as Record<string, unknown> | undefined;
    const chatId = chatData.id as string;
    const projectId = (chatData.projectId as string) || project.id;
    const webUrl = (chatData.webUrl as string) || null;

    // If no version yet, poll for it (v0 might still be building)
    if (!latestVersion?.id && chatId) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 5000)); // wait 5s
        try {
          const refreshed = await v0.chats.getById({ chatId });
          if (refreshed.latestVersion?.id) {
            latestVersion = refreshed.latestVersion as unknown as Record<string, unknown>;
            break;
          }
        } catch { /* continue polling */ }
      }
    }

    const fileCount = (latestVersion?.files as unknown[])?.length || 0;
    const demoUrl = (latestVersion?.demoUrl as string) || null;

    // Auto-deploy with retry
    if (latestVersion?.id) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const deployment = await v0.deployments.create({
            projectId,
            chatId,
            versionId: latestVersion.id as string,
          });
          const deployData = deployment as unknown as Record<string, unknown>;
          const deployedUrl = (deployData.webUrl as string) || demoUrl;
          if (deployedUrl) {
            return {
              summary: `Generated ${fileCount} files and deployed via v0`,
              demoUrl: deployedUrl,
              webUrl,
              v0ChatId: chatId,
              v0ProjectId: projectId,
            };
          }
          break;
        } catch (deployErr) {
          console.error(`v0 deploy attempt ${attempt + 1} failed:`, deployErr);
          if (attempt === 0) await new Promise(r => setTimeout(r, 3000));
        }
      }
    }

    return {
      summary: `Generated ${fileCount} files via v0`,
      demoUrl,
      webUrl,
      v0ChatId: chatId,
      v0ProjectId: projectId,
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
