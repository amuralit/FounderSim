import { NextRequest } from 'next/server';
import { runResearchAgent } from '@/lib/agents/research';
import { runProductAgent } from '@/lib/agents/product';
import { runArchitectAgent } from '@/lib/agents/architect';
import { runDeveloperAgent } from '@/lib/agents/developer';
import { generateLogo, generateCompetitiveVisual } from '@/lib/image-gen';

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

        let researchOutput: string;
        try {
          researchOutput = await runResearchAgent(companyBrief);
        } catch (e) {
          console.error('Research agent error:', e);
          researchOutput = 'Research data unavailable — proceeding with available information.';
          send('error', { agent: 'research', message: 'Research agent encountered an issue, continuing...' });
        }
        send('agent_output', { agent: 'research', output: researchOutput });
        send('agent_done', { agent: 'research' });

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

        // ── DEVELOPER AGENT ──
        send('agent_start', { agent: 'developer' });
        send('agent_speech', { agent: 'developer', text: 'Building the app with v0 Platform API...' });

        let devResult: { summary: string; demoUrl: string | null; webUrl: string | null; rawCode?: string };
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
        send('agent_output', {
          agent: 'developer',
          output: devResult.summary,
          demoUrl: devResult.demoUrl,
          webUrl: devResult.webUrl,
          rawCode: devResult.rawCode,
        });
        send('agent_done', { agent: 'developer' });

        // ── COLLECT PARALLEL IMAGE RESULTS ──
        const [logo, competitiveVisual] = await Promise.all([logoPromise, competitiveVisualPromise]);
        if (logo) {
          send('image_ready', { type: 'logo', data: logo });
        }
        if (competitiveVisual) {
          send('image_ready', { type: 'competitive_visual', data: competitiveVisual });
        }

        // ── DEPLOY STATUS ──
        send('deploy_status', {
          demoUrl: devResult.demoUrl,
          webUrl: devResult.webUrl,
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
