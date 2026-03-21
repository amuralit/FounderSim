import { NextRequest, NextResponse } from 'next/server';
import { runCeoChat } from '@/lib/agents/ceo';
import { ChatMessage } from '@/lib/agents/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { mission, history } = (await req.json()) as {
      mission: string;
      history: ChatMessage[];
    };

    const result = await runCeoChat(mission, history);
    return NextResponse.json(result);
  } catch (error) {
    console.error('CEO chat error:', error);
    return NextResponse.json(
      { error: 'CEO agent failed', text: 'I hit a snag. Let me try again — what were we discussing?', briefReady: false },
      { status: 500 }
    );
  }
}
