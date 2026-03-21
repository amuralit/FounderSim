import { NextRequest, NextResponse } from 'next/server';
import { runDeveloperAgent } from '@/lib/agents/developer';
import type { DevResult } from '@/lib/agents/developer';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { companyBrief, competitiveAnalysis, prd, architectureDoc } = await req.json();
    if (!companyBrief || !competitiveAnalysis || !prd || !architectureDoc) {
      return NextResponse.json({ error: 'companyBrief, competitiveAnalysis, prd, and architectureDoc are required' }, { status: 400 });
    }
    const result: DevResult = await runDeveloperAgent({ companyBrief, competitiveAnalysis, prd, architectureDoc });
    return NextResponse.json({ agent: 'developer', name: 'Pixel', ...result });
  } catch (error) {
    console.error('Developer agent error:', error);
    return NextResponse.json({ error: 'Developer agent failed' }, { status: 500 });
  }
}
