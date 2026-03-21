import { NextRequest, NextResponse } from 'next/server';
import { runProductAgentStructured, runProductAgent } from '@/lib/agents/product';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { companyBrief, competitiveAnalysis } = await req.json();
    if (!companyBrief || !competitiveAnalysis) {
      return NextResponse.json({ error: 'companyBrief and competitiveAnalysis are required' }, { status: 400 });
    }

    // Try structured output first (generateObject with Zod schema)
    try {
      const result = await runProductAgentStructured(companyBrief, competitiveAnalysis);
      return NextResponse.json({
        agent: 'product',
        name: 'Maya Rodriguez',
        output: result.markdown,
        structured: result.structured,
      });
    } catch (structuredErr) {
      console.warn('Structured product generation failed, falling back to text:', structuredErr);
    }

    // Fallback to text generation
    const output = await runProductAgent(companyBrief, competitiveAnalysis);
    return NextResponse.json({ agent: 'product', name: 'Maya Rodriguez', output });
  } catch (error) {
    console.error('Product agent error:', error);
    return NextResponse.json({ error: 'Product agent failed' }, { status: 500 });
  }
}
