import { NextRequest, NextResponse } from 'next/server';
import { runProductAgent } from '@/lib/agents/product';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { companyBrief, competitiveAnalysis } = await req.json();
    if (!companyBrief || !competitiveAnalysis) {
      return NextResponse.json({ error: 'companyBrief and competitiveAnalysis are required' }, { status: 400 });
    }
    const output = await runProductAgent(companyBrief, competitiveAnalysis);
    return NextResponse.json({ agent: 'product', name: 'Maya Rodriguez', output });
  } catch (error) {
    console.error('Product agent error:', error);
    return NextResponse.json({ error: 'Product agent failed' }, { status: 500 });
  }
}
