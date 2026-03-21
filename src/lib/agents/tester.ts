import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const TestCaseSchema = z.object({
  testCases: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['api', 'ui_check', 'accessibility']),
    endpoint: z.string().describe('URL path to test, e.g. /api/agent'),
    method: z.enum(['GET', 'POST']),
    requestBody: z.string().optional().describe('JSON string for POST body'),
    expectedStatus: z.number(),
    expectedContains: z.array(z.string()).describe('Strings that should appear in the response'),
    priority: z.enum(['P0', 'P1']),
  })),
});

export type TestCase = z.infer<typeof TestCaseSchema>['testCases'][number];

export interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  status: number | null;
  responseTime: number;
  error: string | null;
  details: string;
}

export interface QAReport {
  totalTests: number;
  passed: number;
  failed: number;
  testResults: TestResult[];
  generatedAt: number;
  recommendations: string[];
}

export async function generateTestCases(prd: string, demoUrl: string): Promise<TestCase[]> {
  try {
    const { object } = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: TestCaseSchema,
      prompt: `Generate E2E test cases for this deployed web app.

App URL: ${demoUrl}

Product Requirements:
${prd.substring(0, 2000)}

Generate 5-8 test cases covering:
1. Homepage loads (GET /)
2. API agent endpoint works (POST /api/agent with sample input)
3. Key pages load without errors
4. API returns valid JSON structure
5. Error handling (invalid input returns proper error)

For the /api/agent endpoint, create a realistic test input based on the PRD.
Each test should be independently runnable via fetch().`,
    });
    return object.testCases;
  } catch (err) {
    console.error('Test case generation failed:', err);
    return [{
      id: 'smoke-1',
      name: 'Homepage loads',
      description: 'Verify the homepage returns 200',
      type: 'api' as const,
      endpoint: '/',
      method: 'GET' as const,
      requestBody: undefined,
      expectedStatus: 200,
      expectedContains: ['html'],
      priority: 'P0' as const,
    }];
  }
}

export async function runTests(baseUrl: string, testCases: TestCase[]): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const tc of testCases) {
    const start = Date.now();
    try {
      const url = `${baseUrl}${tc.endpoint}`;
      const options: RequestInit = {
        method: tc.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (tc.method === 'POST' && tc.requestBody) {
        options.body = tc.requestBody;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      options.signal = controller.signal;

      const res = await fetch(url, options);
      clearTimeout(timeout);
      const responseTime = Date.now() - start;
      const text = await res.text();

      const statusMatch = res.status === tc.expectedStatus;
      const contentMatch = tc.expectedContains.every(s =>
        text.toLowerCase().includes(s.toLowerCase())
      );

      results.push({
        testId: tc.id,
        testName: tc.name,
        passed: statusMatch && contentMatch,
        status: res.status,
        responseTime,
        error: !statusMatch
          ? `Expected status ${tc.expectedStatus}, got ${res.status}`
          : !contentMatch
            ? `Response missing expected content`
            : null,
        details: `${res.status} in ${responseTime}ms${!contentMatch ? ' (content mismatch)' : ''}`,
      });
    } catch (err) {
      results.push({
        testId: tc.id,
        testName: tc.name,
        passed: false,
        status: null,
        responseTime: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
        details: 'Request failed',
      });
    }
  }

  return results;
}

export async function generateQAReport(
  testResults: TestResult[],
  prd: string
): Promise<QAReport> {
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;

  let recommendations: string[] = [];
  if (failed > 0) {
    try {
      const { object } = await generateObject({
        model: google('gemini-3-flash-preview'),
        schema: z.object({
          recommendations: z.array(z.string()).describe('Specific fix recommendations'),
        }),
        prompt: `These E2E tests failed on a deployed app. Suggest specific fixes.

Failed tests:
${testResults.filter(r => !r.passed).map(r => `- ${r.testName}: ${r.error}`).join('\n')}

PRD context:
${prd.substring(0, 1000)}

Give 3-5 specific, actionable fix recommendations.`,
      });
      recommendations = object.recommendations;
    } catch {
      recommendations = ['Review server logs for the failed endpoints', 'Check environment variables are set'];
    }
  }

  return {
    totalTests: testResults.length,
    passed,
    failed,
    testResults,
    generatedAt: Date.now(),
    recommendations,
  };
}
