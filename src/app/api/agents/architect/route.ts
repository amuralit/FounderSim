import { NextRequest, NextResponse } from 'next/server';
import { runArchitectAgent, runArchitectAgentStructured } from '@/lib/agents/architect';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { companyBrief, competitiveAnalysis, prd } = await req.json();
    if (!companyBrief || !competitiveAnalysis || !prd) {
      return NextResponse.json({ error: 'companyBrief, competitiveAnalysis, and prd are required' }, { status: 400 });
    }

    // Try structured output first, fall back to plain string
    try {
      const result = await runArchitectAgentStructured(companyBrief, competitiveAnalysis, prd);
      return NextResponse.json({
        agent: 'architect',
        name: 'Atlas',
        structured: result.structured,
        markdown: result.markdown,
      });
    } catch (structuredError) {
      console.error('Structured architect output failed, falling back to plain text:', structuredError);
      const output = await runArchitectAgent(companyBrief, competitiveAnalysis, prd);
      return NextResponse.json({
        agent: 'architect',
        name: 'Atlas',
        structured: null,
        markdown: output,
      });
    }
  } catch (error) {
    console.error('Architect agent error:', error);
    return NextResponse.json({ error: 'Architect agent failed' }, { status: 500 });
  }
}
