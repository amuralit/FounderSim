import { NextRequest, NextResponse } from 'next/server';
import { runResearchAgent } from '@/lib/agents/research';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { companyBrief } = await req.json();
    if (!companyBrief) return NextResponse.json({ error: 'companyBrief is required' }, { status: 400 });
    const result = await runResearchAgent(companyBrief);
    return NextResponse.json({
      agent: 'research',
      name: 'Dr. Kai Patel',
      output: result.rawAnalysis,
      structured: {
        competitors: result.competitors,
        marketGap: result.marketGap,
        persona: result.persona,
        marketSize: result.marketSize,
      },
    });
  } catch (error) {
    console.error('Research agent error:', error);
    return NextResponse.json({ error: 'Research agent failed' }, { status: 500 });
  }
}
