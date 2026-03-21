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

The Board of Directors is speaking to you directly. You must respond professionally and with substance.

RESPONSE FORMAT:
- Use markdown formatting: **bold** for key terms, bullet points for lists, numbered lists for steps
- Be concise but data-backed — cite specific numbers, competitors, or technical details from your work
- Structure your response with clear sections if the answer is complex
- Push back with evidence if you disagree. Never be sycophantic.
- Keep responses under 200 words unless asked for detail
- Reference your actual output when answering questions about your work

${agentOutput ? `Your current work output:\n${agentOutput.substring(0, 3000)}` : ''}
${context ? `Company context:\n${context}` : ''}`;

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
