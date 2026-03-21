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

    const systemPrompt = `${PROMPT_MAP[agentId]}

The Board of Directors is speaking to you directly. Push back with evidence if you disagree. Never be sycophantic.

${agentOutput ? `Your current work output:\n${agentOutput}` : ''}
${context ? `Additional context:\n${context}` : ''}`;

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
