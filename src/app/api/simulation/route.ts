import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { runResearchAgent } from '@/lib/agents/research';
import { runProductAgent } from '@/lib/agents/product';
import { runArchitectAgent } from '@/lib/agents/architect';
import { runDeveloperAgent } from '@/lib/agents/developer';
import { generateTestCases, runTests, generateQAReport } from '@/lib/agents/tester';
import { generateLogo, generateCompetitiveVisual, generateMarketMap, generateArchitectureDiagram, generateProductMockup } from '@/lib/image-gen';

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

        // ── DEBATE: CEO + Product review Research ──
        send('agent_speech', { agent: 'ceo', text: 'Reviewing Scout\'s research...' });

        // CEO reviews
        let ceoResearchVerdict = '';
        try {
          const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: 'You are Nova, the CEO. Review the research analyst\'s competitive intelligence. In 2 sentences: is the data solid? Any gaps? End with GO or NEEDS WORK.',
            prompt: `Brief: ${companyBrief.substring(0, 500)}\n\nResearch:\n${researchOutput.substring(0, 2000)}`,
          });
          ceoResearchVerdict = text;
          send('agent_speech', { agent: 'ceo', text: text.substring(0, 200) });
        } catch { ceoResearchVerdict = 'GO'; }

        // Product agent previews research for their needs
        try {
          const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: 'You are Sage, the Product manager. Review the research data. In 2 sentences: does this give you enough to write a PRD? Any missing data you need? End with GO or REQUEST.',
            prompt: `Brief: ${companyBrief.substring(0, 500)}\n\nResearch:\n${researchOutput.substring(0, 2000)}`,
          });
          send('agent_speech', { agent: 'product', text: text.substring(0, 200) });
        } catch { /* non-blocking */ }

        // CEO gives GO
        send('agent_speech', { agent: 'ceo', text: ceoResearchVerdict.includes('NEEDS WORK') ? 'Noted gaps, but proceeding. Scout, refine in v2.' : 'Research approved. Sage, you\'re up.' });

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

        // ── DEBATE: CEO + Architect review Product ──
        send('agent_speech', { agent: 'ceo', text: 'Reviewing Sage\'s PRD...' });

        let ceoProductVerdict = '';
        try {
          const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: 'You are Nova, the CEO. Review the PRD. In 2 sentences: is the MVP scope right? Is the killer feature clear? End with GO or NEEDS WORK.',
            prompt: `Brief: ${companyBrief.substring(0, 500)}\n\nPRD:\n${productOutput.substring(0, 2000)}`,
          });
          ceoProductVerdict = text;
          send('agent_speech', { agent: 'ceo', text: text.substring(0, 200) });
        } catch { ceoProductVerdict = 'GO'; }

        // Architect previews PRD for feasibility
        try {
          const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: 'You are Atlas, the Architect. Review the PRD for technical feasibility. In 2 sentences: can this be built in 2 weeks? Any features that are technically risky? End with GO or FLAG.',
            prompt: `Brief: ${companyBrief.substring(0, 500)}\n\nPRD:\n${productOutput.substring(0, 2000)}`,
          });
          send('agent_speech', { agent: 'architect', text: text.substring(0, 200) });
        } catch { /* non-blocking */ }

        send('agent_speech', { agent: 'ceo', text: ceoProductVerdict.includes('NEEDS WORK') ? 'Scope concerns noted. Proceeding with caveats.' : 'PRD approved. Atlas, design the system.' });

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

        // ── DEBATE: CEO + Developer review Architecture ──
        send('agent_speech', { agent: 'ceo', text: 'Reviewing Atlas\'s architecture...' });

        let ceoArchVerdict = '';
        try {
          const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: 'You are Nova, the CEO. Review the architecture. In 2 sentences: is this overengineered for an MVP? Is the agent endpoint design clear? End with GO or SIMPLIFY.',
            prompt: `Brief: ${companyBrief.substring(0, 500)}\n\nArchitecture:\n${architectOutput.substring(0, 2000)}`,
          });
          ceoArchVerdict = text;
          send('agent_speech', { agent: 'ceo', text: text.substring(0, 200) });
        } catch { ceoArchVerdict = 'GO'; }

        // Developer previews architecture for buildability
        try {
          const { text } = await generateText({
            model: google('gemini-3-flash-preview'),
            system: 'You are Pixel, the Developer. Review the architecture. In 2 sentences: can you build this? Any specs missing or unclear? End with GO or CLARIFY.',
            prompt: `Brief: ${companyBrief.substring(0, 500)}\n\nArchitecture:\n${architectOutput.substring(0, 2000)}`,
          });
          send('agent_speech', { agent: 'developer', text: text.substring(0, 200) });
        } catch { /* non-blocking */ }

        send('agent_speech', { agent: 'ceo', text: ceoArchVerdict.includes('SIMPLIFY') ? 'Simplification noted. Pixel, build smart.' : 'Architecture approved. Pixel, ship it.' });

        // Fire architecture diagram gen in parallel (non-blocking)
        const archDiagramPromise = generateArchitectureDiagram(
          architectOutput.substring(0, 400)
        ).catch(() => null);

        // ── DEVELOPER AGENT ──
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

        // ── COLLECT PARALLEL IMAGE RESULTS ──
        const [logo, competitiveVisual, marketMap, archDiagram, productMockup] = await Promise.all([
          logoPromise, competitiveVisualPromise, marketMapPromise, archDiagramPromise, productMockupPromise,
        ]);
        if (logo) {
          send('image_ready', { type: 'logo', data: logo });
        }
        if (competitiveVisual) {
          send('image_ready', { type: 'competitive_visual', data: competitiveVisual });
        }
        if (marketMap) {
          send('image_ready', { type: 'market_map', data: marketMap });
        }
        if (archDiagram) {
          send('image_ready', { type: 'architecture_diagram', data: archDiagram });
        }
        if (productMockup) {
          send('image_ready', { type: 'product_mockup', data: productMockup });
        }

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
