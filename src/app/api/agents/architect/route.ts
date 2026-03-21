import { NextRequest, NextResponse } from 'next/server';
import { runArchitectAgent } from '@/lib/agents/architect';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { companyBrief, competitiveAnalysis, prd } = await req.json();
    if (!companyBrief || !competitiveAnalysis || !prd) {
      return NextResponse.json({ error: 'companyBrief, competitiveAnalysis, and prd are required' }, { status: 400 });
    }
    const output = await runArchitectAgent(companyBrief, competitiveAnalysis, prd);
    return NextResponse.json({ agent: 'architect', name: 'James Okonkwo', output });
  } catch (error) {
    console.error('Architect agent error:', error);
    return NextResponse.json({ error: 'Architect agent failed' }, { status: 500 });
  }
}
