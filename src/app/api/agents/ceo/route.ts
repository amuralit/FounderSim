import { NextRequest, NextResponse } from 'next/server';
import { runCeoChat } from '@/lib/agents/ceo';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { mission, history = [] } = await req.json();
    if (!mission) return NextResponse.json({ error: 'mission is required' }, { status: 400 });
    const result = await runCeoChat(mission, history);
    return NextResponse.json(result);
  } catch (error) {
    console.error('CEO agent error:', error);
    return NextResponse.json({ error: 'CEO agent failed' }, { status: 500 });
  }
}
