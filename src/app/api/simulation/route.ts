import { NextRequest } from 'next/server';
import { runResearchAgent } from '@/lib/agents/research';
import { runProductAgent } from '@/lib/agents/product';
import { runArchitectAgent } from '@/lib/agents/architect';
import { runDeveloperAgent } from '@/lib/agents/developer';
import { generateTestCases, runTests, generateQAReport } from '@/lib/agents/tester';
import { generateLogo, generateCompetitiveVisual, generateMarketMap, generateProductMockup } from '@/lib/image-gen';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function sseEncode(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { companyBrief } = (await req.json()) as { companyBrief: string };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        } catch (e) {
          console.error('SSE send error:', e);
        }
      };

      try {
        // ── RESEARCH AGENT ──
        send('agent_start', { agent: 'research' });
        send('agent_speech', { agent: 'research', text: 'Searching for real competitors using Google Search...' });

        // Fire logo gen in parallel (non-blocking)
        const logoPromise = generateLogo(companyBrief).catch(() => null);

        let researchResult: { rawAnalysis: string };
        try {
          researchResult = await runResearchAgent(companyBrief);
        } catch (e) {
          console.error('Research agent error:', e);
          researchResult = { rawAnalysis: 'Research data unavailable — proceeding with available information.' };
          send('error', { agent: 'research', message: 'Research agent encountered an issue, continuing...' });
        }
        const researchOutput = researchResult.rawAnalysis;
        send('agent_output', { agent: 'research', output: researchOutput });
        send('agent_done', { agent: 'research' });

        // Fire market map gen in parallel (non-blocking)
        const marketMapPromise = generateMarketMap(
          companyBrief.split('\n')[0] || 'startup',
          researchOutput.substring(0, 300)
        ).catch(() => null);

        // ── PRODUCT AGENT ──
        send('agent_start', { agent: 'product' });
        send('agent_speech', { agent: 'product', text: 'Defining MVP features based on market gaps...' });

        // Fire competitive visual in parallel (non-blocking)
        const competitiveVisualPromise = generateCompetitiveVisual(
          companyBrief.split('\n')[0] || 'startup',
          researchOutput.substring(0, 500)
        ).catch(() => null);

        let productOutput: string;
        try {
          productOutput = await runProductAgent(companyBrief, researchOutput);
        } catch (e) {
          console.error('Product agent error:', e);
          productOutput = 'PRD generation encountered an issue.';
          send('error', { agent: 'product', message: 'Product agent encountered an issue, continuing...' });
        }
        send('agent_output', { agent: 'product', output: productOutput });
        send('agent_done', { agent: 'product' });

        // Fire product mockup gen in parallel (non-blocking)
        const productMockupPromise = generateProductMockup(
          companyBrief.split('\n')[0] || 'product',
          productOutput.substring(0, 300)
        ).catch(() => null);

        // ── APPROVAL GATE: MVP SCOPE ──
        send('approval_gate', {
          id: 'mvp-scope',
          agent: 'product',
          question: 'Approve this MVP scope?',
          details: productOutput.substring(0, 500),
          autoApproveMs: 10000,
        });

        // ── ARCHITECT AGENT ──
        send('agent_start', { agent: 'architect' });
        send('agent_speech', { agent: 'architect', text: 'Designing system architecture with Mermaid diagrams...' });

        let architectOutput: string;
        try {
          architectOutput = await runArchitectAgent(companyBrief, researchOutput, productOutput);
        } catch (e) {
          console.error('Architect agent error:', e);
          architectOutput = 'Architecture document generation encountered an issue.';
          send('error', { agent: 'architect', message: 'Architect agent encountered an issue, continuing...' });
        }
        send('agent_output', { agent: 'architect', output: architectOutput });
        send('agent_done', { agent: 'architect' });

        // ── IMAGES: send each as it arrives (don't block pipeline) ──
        const withTimeout = (p: Promise<string | null>, ms: number) =>
          Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))]);

        // Fire image sends in background — they'll arrive during developer build
        const imageCollectionPromise = Promise.allSettled([
          withTimeout(logoPromise, 25000).then(d => { if (d) send('image_ready', { type: 'logo', data: d }); }),
          withTimeout(competitiveVisualPromise, 25000).then(d => { if (d) send('image_ready', { type: 'competitive_visual', data: d }); }),
          withTimeout(marketMapPromise, 25000).then(d => { if (d) send('image_ready', { type: 'market_map', data: d }); }),
          withTimeout(productMockupPromise, 25000).then(d => { if (d) send('image_ready', { type: 'product_mockup', data: d }); }),
        ]).catch(() => {});

        // ── DEVELOPER AGENT (starts immediately, images arrive in parallel) ──
        send('agent_start', { agent: 'developer' });
        send('agent_speech', { agent: 'developer', text: 'Building the app with v0 Platform API...' });

        let devResult: { summary: string; demoUrl: string | null; webUrl: string | null; rawCode?: string; v0ChatId?: string; v0ProjectId?: string };
        try {
          devResult = await runDeveloperAgent({
            companyBrief,
            competitiveAnalysis: researchOutput,
            prd: productOutput,
            architectureDoc: architectOutput,
          });
        } catch (e) {
          console.error('Developer agent error:', e);
          devResult = { summary: 'Code generation encountered an issue.', demoUrl: null, webUrl: null };
          send('error', { agent: 'developer', message: 'Developer agent encountered an issue.' });
        }
        const devSummary = devResult.demoUrl
          ? `Code generated and deploying to Vercel. Demo: ${devResult.demoUrl}`
          : devResult.webUrl
            ? `Code generated via v0. v0 is still building — check progress: ${devResult.webUrl}`
            : devResult.rawCode
              ? 'Code generated via Gemini (v0 unavailable). Ready for manual deployment.'
              : devResult.summary;

        send('agent_output', {
          agent: 'developer',
          output: devSummary,
          demoUrl: devResult.demoUrl,
          webUrl: devResult.webUrl,
          rawCode: devResult.rawCode,
        });
        send('agent_speech', { agent: 'developer', text: devResult.webUrl ? 'Code sent to v0 — building in progress...' : 'Code generation complete.' });
        send('agent_done', { agent: 'developer' });

        // ── TESTING AGENT ──
        if (devResult.demoUrl) {
          send('agent_start', { agent: 'tester' });
          send('agent_speech', { agent: 'tester', text: 'Running E2E tests on the deployed app...' });

          try {
            const testCases = await generateTestCases(productOutput, devResult.demoUrl);
            send('agent_speech', { agent: 'tester', text: `Generated ${testCases.length} test cases. Running...` });

            const testResults = await runTests(devResult.demoUrl, testCases);
            const report = await generateQAReport(testResults, productOutput);

            const testerPassed = report.passed;
            const testerFailed = report.failed;
            const testerSummary = `## QA Report\n\n**${testerPassed}/${report.totalTests} tests passed**\n\n` +
              report.testResults.map(r =>
                `- ${r.passed ? '✅' : '❌'} **${r.testName}** — ${r.details}`
              ).join('\n') +
              (testerFailed > 0 && report.recommendations.length > 0
                ? `\n\n### Recommendations\n\n${report.recommendations.map(r => `- ${r}`).join('\n')}`
                : '');

            send('agent_output', { agent: 'tester', output: testerSummary });
            send('agent_speech', { agent: 'tester', text: testerFailed > 0 ? `${testerFailed} tests failed — see report` : 'All tests passed!' });
            send('agent_done', { agent: 'tester' });
          } catch (e) {
            console.error('Testing agent error:', e);
            send('agent_speech', { agent: 'tester', text: 'Testing encountered an issue.' });
            send('agent_output', { agent: 'tester', output: 'QA testing could not be completed. The deployed app may still be initializing.' });
            send('agent_done', { agent: 'tester' });
          }
        }

        // Wait for images before closing stream (they've been generating in parallel)
        await imageCollectionPromise.catch(() => {});

        // ── DEPLOY STATUS ──
        send('deploy_status', {
          demoUrl: devResult.demoUrl,
          webUrl: devResult.webUrl,
          v0ChatId: devResult.v0ChatId || null,
          v0ProjectId: devResult.v0ProjectId || null,
          status: devResult.demoUrl ? 'deployed' : 'code_generated',
        });

        // ── APPROVAL GATE: DEPLOY ──
        if (devResult.demoUrl) {
          send('approval_gate', {
            id: 'deploy',
            agent: 'developer',
            question: 'Deploy to Vercel?',
            details: `Demo URL: ${devResult.demoUrl}`,
            autoApproveMs: 10000,
          });
        }

        // ── DONE ──
        send('phase_change', { phase: 'delivered' });
      } catch (e) {
        console.error('Pipeline error:', e);
        send('error', { message: 'Pipeline encountered an error.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
