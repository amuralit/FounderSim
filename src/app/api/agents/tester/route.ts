import { NextRequest, NextResponse } from 'next/server';
import { generateTestCases, runTests, generateQAReport } from '@/lib/agents/tester';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { demoUrl, prd } = await req.json();
    if (!demoUrl || !prd) {
      return NextResponse.json({ error: 'demoUrl and prd are required' }, { status: 400 });
    }

    // Generate test cases from PRD
    const testCases = await generateTestCases(prd, demoUrl);

    // Run tests against the deployed app
    const testResults = await runTests(demoUrl, testCases);

    // Generate QA report with recommendations
    const report = await generateQAReport(testResults, prd);

    return NextResponse.json({
      agent: 'tester',
      name: 'Sentinel',
      testCases,
      report,
    });
  } catch (error) {
    console.error('Tester agent error:', error);
    return NextResponse.json({ error: 'Testing agent failed' }, { status: 500 });
  }
}
