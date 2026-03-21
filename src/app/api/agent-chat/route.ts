import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { AGENTS } from '@/lib/agents/config';
import * as prompts from '@/lib/prompts';
import { AgentId } from '@/lib/agents/types';

export const maxDuration = 60;

const PROMPT_MAP: Record<AgentId, string> = {
  ceo: prompts.CEO_SYSTEM_PROMPT,
  research: prompts.RESEARCH_SYSTEM_PROMPT,
  product: prompts.PRODUCT_SYSTEM_PROMPT,
  architect: prompts.ARCHITECT_SYSTEM_PROMPT,
  developer: prompts.DEVELOPER_SYSTEM_PROMPT,
  tester: 'You are Sentinel, the QA engineer. You break things before users do. Zero tolerance for bugs.',
};

export async function POST(req: NextRequest) {
  try {
    const { agentId, message, agentOutput, context } = (await req.json()) as {
      agentId: AgentId;
      message: string;
      agentOutput?: string;
      context?: string;
    };

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agentDef = AGENTS.find(a => a.id === agentId)!;
    const systemPrompt = `You are ${agentDef.name}, the ${agentDef.role} at this startup. ${agentDef.personality}

Your work is ALREADY COMPLETE. The pipeline has finished. You are now answering follow-up questions from the Board of Directors about your deliverables.

CRITICAL RULES:
- Do NOT suggest starting a pipeline, saying "go", or generating new briefs
- Do NOT act as if you're still in the planning phase
- Your work output is shown below — answer questions ABOUT IT
- Summarize, explain, defend, or refine your work when asked
- Use markdown formatting: **bold** for key terms, bullet points, numbered lists
- Be concise, data-backed, and professional
- Keep responses under 200 words unless asked for detail
- Reference specific data from your output (competitor names, metrics, features, etc.)

${agentOutput ? `YOUR COMPLETED WORK:\n${agentOutput.substring(0, 3000)}` : 'No output yet — work is still in progress.'}
${context ? `COMPANY CONTEXT:\n${context}` : ''}`;

    const { text } = await generateText({
      model: google('gemini-3-flash-preview'),
      system: systemPrompt,
      prompt: message,
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Agent chat error:', error);
    return NextResponse.json(
      { error: 'Agent chat failed', text: 'Let me reconsider that. Can you rephrase?' },
      { status: 500 }
    );
  }
}
