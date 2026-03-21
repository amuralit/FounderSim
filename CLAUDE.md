# CLAUDE.md — FounderSim

> **YOU ARE THE BUILDER. Read this file and AGENTS.md fully, then execute EVERY step below autonomously. Do not skip steps. Do not ask clarifying questions — use these specs to decide. Run `pnpm dev` after each major step to verify.**

---

## STEP 0: INTERACTIVE SETUP (Do This First)

### 0a. Prompt the user for API keys

Ask the user for these keys ONE AT A TIME. Explain what each is for. Create `.env.local` with their answers.

```
Keys needed:

1. GOOGLE_GENERATIVE_AI_API_KEY (REQUIRED)
   → Powers all 5 AI agents + image generation
   → Get from: https://aistudio.google.com/apikey

2. V0_API_KEY (REQUIRED)  
   → Powers the Developer Agent's code generation
   → Get from: https://v0.dev/chat/settings/keys (needs v0 Premium)

3. VERCEL_TOKEN (optional, for deploying generated apps)
   → Get from: https://vercel.com/account/tokens

4. NEXT_PUBLIC_SUPABASE_URL (optional, for database in generated apps)
5. SUPABASE_SERVICE_ROLE_KEY (optional, for database in generated apps)
   → Both from: Supabase Dashboard → Settings → API
```

Write `.env.local` with whatever the user provides. If they skip optional keys, leave those lines empty but present.

### 0b. Check if Next.js project exists, scaffold if not

If there is no `package.json` or `next.config.*` in the current directory, run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --use-pnpm --no-git
```
(Use `--no-git` if a git repo already exists. Accept all defaults.)

### 0c. Install dependencies

```bash
pnpm add ai @ai-sdk/google @google/genai v0-sdk @supabase/supabase-js zod react-markdown remark-gfm jspdf
```

### 0d. Create vercel.json

```json
{
  "functions": {
    "src/app/api/simulation/route.ts": { "maxDuration": 300 },
    "src/app/api/ceo-chat/route.ts": { "maxDuration": 60 },
    "src/app/api/agent-chat/route.ts": { "maxDuration": 60 }
  }
}
```

### 0e. Create next.config.ts (if not exists) with server external packages

```typescript
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/genai', 'v0-sdk'],
};
export default nextConfig;
```

### 0f. Copy .env.example and README.md into repo root (they should already be in the project directory)

---

## WHAT YOU'RE BUILDING

FounderSim: 5 AI agents build a real company from one sentence. Users watch agents work in a spatial AI-Town-style office, click agents to inspect their output, chat to redirect decisions, and approve key gates. 

**Final output (Fundraising Kit):**
- Tab 1: Live deployed product (real Vercel URL)
- Tab 2: Pitch deck with real competitor data
- Tab 3: Market research with verified pricing + source URLs
- Tab 4: Architecture docs with Mermaid diagrams + SQL schema
- Tab 5: Decision log of every debate, approval, and override

**Hosted at:** `foundersim.vercel.app` — NOT localhost. This is a hackathon demo.

---

## TECH STACK (do not deviate)

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Vercel AI SDK 6 (`ai` + `@ai-sdk/google`) — agent pipeline orchestration
- v0 Platform API (`v0-sdk`) — Developer Agent code generation (PRIMARY)
- Gemini 3.1 Pro (`gemini-3.1-pro-preview`) — agent reasoning, fallback code gen
- Gemini 3 Flash (`gemini-3-flash-preview`) — CEO fast exchanges, agent chat
- Google Search + URL Context (Gemini built-in tools) — real market data
- Nano Banana Pro (`gemini-3-pro-image-preview`) — logo, pitch deck slide images
- Nano Banana 2 (`gemini-3.1-flash-image-preview`) — competitive visual
- `@google/genai` SDK — for Research Agent tool combos + image gen
- Supabase (`@supabase/supabase-js`) — optional database for generated apps
- jsPDF — pitch deck PDF export

---

## PROJECT STRUCTURE

```
src/
├── app/
│   ├── layout.tsx              # Dark theme, system fonts
│   ├── page.tsx                # Main FounderSim page
│   ├── globals.css             # Dark theme CSS vars
│   └── api/
│       ├── simulation/route.ts # SSE — full agent pipeline
│       ├── ceo-chat/route.ts   # CEO conversation phase
│       └── agent-chat/route.ts # Post-delivery agent chat
├── components/
│   ├── FounderSim.tsx          # Main orchestrator (state machine)
│   ├── OfficeView.tsx          # Spatial office with zones + agent avatars
│   ├── AgentAvatar.tsx         # Agent circle + speech bubble + status dot
│   ├── InspectorPanel.tsx      # Right slide-in: agent output + chat
│   ├── ApprovalGate.tsx        # Floating amber decision card
│   ├── KeyVault.tsx            # Deploy key inputs (zero friction)
│   ├── FundraisingKit.tsx      # 5-tab deliverable modal
│   ├── PitchDeck.tsx           # Slide viewer with prev/next
│   └── MissionInput.tsx        # "What company?" full-screen overlay
└── lib/
    ├── agents/
    │   ├── types.ts            # All shared TypeScript types
    │   ├── config.ts           # Agent definitions (names, colors, avatars, positions)
    │   ├── ceo.ts              # Ada — conversation + company brief
    │   ├── research.ts         # Kai — Google Search + URL Context
    │   ├── product.ts          # Maya — PRD generation
    │   ├── architect.ts        # James — architecture + SQL + Mermaid
    │   └── developer.ts        # Priya — v0 code gen + fallback Gemini
    ├── image-gen.ts            # Nano Banana Pro/2 wrappers
    └── prompts.ts              # System prompts from AGENTS.md (copy them here)
```

---

## STEP 1: Types + Agent Config + Dark Theme

### types.ts
```typescript
export type AgentId = 'ceo' | 'research' | 'product' | 'architect' | 'developer';
export type AgentStatus = 'idle' | 'waiting' | 'working' | 'done' | 'error';
export type SimPhase = 'idle' | 'ceo_conversation' | 'pipeline' | 'delivered';

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  avatar: string;
  personality: string;
  zone: string;
  defaultPosition: { x: number; y: number };
}

export interface ChatMessage { from: 'user' | AgentId; text: string; ts: number; }
export interface DecisionEntry { ts: number; agent: AgentId; type: string; desc: string; }

export interface SSEEvent {
  type: 'agent_start' | 'agent_speech' | 'agent_output' | 'agent_done' |
        'approval_gate' | 'image_ready' | 'deploy_status' | 'phase_change' | 'error';
  data: Record<string, unknown>;
}
```

### config.ts — Agent definitions
```typescript
export const AGENTS: AgentDef[] = [
  { id: 'ceo', name: 'Ada Chen', role: 'CEO', color: '#f59e0b',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Ada&backgroundColor=f59e0b',
    personality: 'First-principles thinker. Cuts ambiguity.', zone: 'ceo-office',
    defaultPosition: { x: 50, y: 28 } },
  { id: 'research', name: 'Dr. Kai Patel', role: 'Research', color: '#3b82f6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Kai&backgroundColor=3b82f6',
    personality: 'Data-driven. Every claim has a source.', zone: 'research-lab',
    defaultPosition: { x: 15, y: 18 } },
  { id: 'product', name: 'Maya Rodriguez', role: 'Product', color: '#8b5cf6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Maya&backgroundColor=8b5cf6',
    personality: 'User-obsessed. Kills features with conviction.', zone: 'war-room',
    defaultPosition: { x: 72, y: 18 } },
  { id: 'architect', name: 'James Okonkwo', role: 'Architect', color: '#06b6d4',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=James&backgroundColor=06b6d4',
    personality: 'Boring is beautiful. Documents every tradeoff.', zone: 'architecture',
    defaultPosition: { x: 50, y: 72 } },
  { id: 'developer', name: 'Priya Sharma', role: 'Developer', color: '#10b981',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Priya&backgroundColor=10b981',
    personality: 'Ships clean code. Allergic to over-engineering.', zone: 'dev-bay',
    defaultPosition: { x: 82, y: 72 } },
];
```

### globals.css — Dark theme
```css
:root {
  --bg-primary: #08080e; --bg-secondary: #0c0c14; --bg-card: #12121a;
  --border: #1e1e2e; --border-hover: #2a2a3a;
  --text-primary: #e2e2f0; --text-secondary: #888; --text-muted: #555;
}
body { background: var(--bg-primary); color: var(--text-primary); font-family: system-ui, -apple-system, sans-serif; }
::selection { background: #f59e0b33; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
```

### layout.tsx — Root layout
Dark background, system fonts, metadata: "FounderSim — From idea to investor-ready"

### prompts.ts — ALL system prompts from AGENTS.md
Create `src/lib/prompts.ts`. Copy ALL 5 system prompts from AGENTS.md as exported constants:
```typescript
export const CEO_SYSTEM_PROMPT = `You are Ada Chen...`; // Full prompt from AGENTS.md
export const RESEARCH_SYSTEM_PROMPT = `You are Dr. Kai Patel...`;
export const PRODUCT_SYSTEM_PROMPT = `You are Maya Rodriguez...`;
export const ARCHITECT_SYSTEM_PROMPT = `You are James Okonkwo...`;
export const DEVELOPER_SYSTEM_PROMPT = `You are Priya Sharma...`;
```
Copy the COMPLETE text of each system prompt block from AGENTS.md. Do not abbreviate.

---

## STEP 2: Spatial Office UI

**Reference `foundersim-prototype.jsx` for the exact visual design.** Match its look.

### OfficeView.tsx
- 7 zones as absolute-positioned divs with subtle borders (`rgba(255,255,255,0.05)`)
- Zones: CEO Office (center-top), Research Lab (top-left), War Room (top-right), Architecture (center-bottom), Dev Bay (bottom-right), Deploy Bay (bottom-left), Debate Arena (center)
- Zone labels: uppercase, 10px, muted color
- SVG layer for connection lines between communicating agents (dashed, agent color, 0.3 opacity)
- Render AgentAvatars at their positions

### AgentAvatar.tsx
- 56px circle, DiceBear image, 2px colored border
- Status dot (12px): green=done, agentColor=working, gray=waiting, dark=idle
- Pulsing ring animation when `status === 'working'`
- Speech bubble: absolute above, dark bg, agent-color border, auto-dismiss 5s
- Click handler → opens InspectorPanel
- Movement: `transition: all 1.5s cubic-bezier(0.4,0,0.2,1)` on left/top

### MissionInput.tsx
- Full-screen dark glass overlay (`backdrop-filter: blur(20px)`)
- "What company should we build?" with gradient text
- Text input + "Build It →" gradient button
- Example placeholder: "A tool that helps freelancers track invoices and get paid faster"

---

## STEP 3: Inspector Panel + Agent Chat

### InspectorPanel.tsx — Slides in from right (40% width)
- Agent header: 44px avatar, name, role badge, status
- Personality quote (italic, muted)
- Output: `react-markdown` + `remark-gfm` rendering of agent's markdown output
- Chat: message history + input + send button
- User messages: right-aligned, amber bg. Agent: left-aligned, agent-color border-left.
- Close (×) button top-right

### /api/agent-chat/route.ts
- POST: `{ agentId, message, agentOutput, context }`
- Uses `generateText` with `google('gemini-3-flash-preview')` for fast response
- System prompt from AGENTS.md + "The Board is directing you. Push back with evidence. Never sycophantic."

---

## STEP 4: CEO Conversation Phase

### /api/ceo-chat/route.ts
- POST: `{ mission, history: ChatMessage[] }`
- Uses Ada's full system prompt from AGENTS.md
- Model: `google('gemini-3.1-pro-preview')` 
- When user says "go"/"start"/"build"/"proceed" → Ada generates Company Brief → return `{ briefReady: true, brief }`
- Otherwise returns Ada's conversational response

### In FounderSim.tsx
- After mission submit → phase = `ceo_conversation`
- Show Ada's avatar active in CEO office
- Chat interface in InspectorPanel (auto-open on Ada)
- When CEO chat API returns `{ briefReady: true, brief }`:
  1. Store `companyBrief` in state
  2. Set phase = `pipeline`
  3. POST `{ companyBrief }` to `/api/simulation` to start SSE stream
  4. Start consuming SSE events and updating agent statuses/outputs

---

## STEP 5: Agent Pipeline (SSE Streaming)

### /api/simulation/route.ts
```
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
```

POST body: `{ companyBrief: string }`
Returns: SSE event stream (`text/event-stream`)

**Pipeline order:**
1. Research Agent → real competitor data (Google Search + URL Context)
2. [PARALLEL] Logo generation (Nano Banana Pro) — don't await, fire and collect later
3. Product Agent → PRD
4. EMIT approval_gate: "Approve MVP scope?" (auto-approve after 10s for demo flow)
5. Architect Agent → architecture doc + Mermaid + SQL
6. Developer Agent → v0 Platform API code gen (fallback: Gemini direct)
7. EMIT deploy_status with demo URL
8. EMIT phase_change: 'delivered'

Each agent step emits: `agent_start`, `agent_speech` (streaming updates), `agent_output`, `agent_done`

### Frontend SSE consumption in FounderSim.tsx
```typescript
const res = await fetch('/api/simulation', { method: 'POST', body: JSON.stringify({ companyBrief }) });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
// Read SSE events, parse JSON, update React state
```

---

## STEP 6: Research Agent (THE Differentiator)

### src/lib/agents/research.ts
Use `@google/genai` SDK (NOT AI SDK) for Search + URL Context combo:

```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

export async function runResearchAgent(companyBrief: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `${RESEARCH_SYSTEM_PROMPT}\n\nCompany Brief:\n${companyBrief}\n\nResearch this market using Google Search. Find 5-8 real competitors with real pricing. Visit their websites.`,
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }],
      thinkingConfig: { thinkingLevel: 'HIGH' },
    },
  });
  return response.text || '';
}
```

System prompt: copy Kai's full prompt from AGENTS.md into `prompts.ts`.

---

## STEP 7: Product + Architect Agents

Both use Vercel AI SDK `generateText`:

```typescript
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function runProductAgent(brief: string, research: string) {
  const { text } = await generateText({
    model: google('gemini-3.1-pro-preview'),
    system: PRODUCT_SYSTEM_PROMPT,
    prompt: `Company Brief:\n${brief}\n\nCompetitive Analysis:\n${research}\n\nGenerate the PRD.`,
  });
  return text;
}
```

Same pattern for Architect (receives brief + research + PRD). System prompts from AGENTS.md.

---

## STEP 8: Developer Agent (v0 Platform API)

### src/lib/agents/developer.ts

**Primary: v0 SDK**
The v0 SDK auto-reads `V0_API_KEY` from environment. If that doesn't work, use `createClient`:
```typescript
import { v0 } from 'v0-sdk';
// v0 auto-reads process.env.V0_API_KEY
// If that fails, use: import { createClient } from 'v0-sdk'; const v0 = createClient({ apiKey: process.env.V0_API_KEY });

export async function runDeveloperAgent(specs: {
  companyBrief: string; competitiveAnalysis: string; prd: string; architectureDoc: string;
}) {
  const allSpecs = `## Company\n${specs.companyBrief}\n\n## Market Research (use for ALL copy)\n${specs.competitiveAnalysis}\n\n## Product Requirements\n${specs.prd}\n\n## Architecture\n${specs.architectureDoc}`;
  
  try {
    const project = await v0.projects.create({ name: 'foundersim-gen' });
    const chat = await v0.chats.create({
      projectId: project.id,
      message: `Build a complete Next.js 15 app.\n\n${allSpecs}\n\nReal data in all copy. Functional pages. Apple-level UX. Use shadcn/ui.`,
      system: 'Building production MVP from 4 specialized agent specs. Follow precisely.',
    });
    return {
      summary: `Generated ${chat.latestVersion?.files?.length || 0} files`,
      demoUrl: chat.latestVersion?.demoUrl || null,
      webUrl: chat.webUrl,
    };
  } catch (err) {
    // FALLBACK: Gemini 3.1 Pro direct code gen
    const { text } = await generateText({
      model: google('gemini-3.1-pro-preview'),
      maxTokens: 32000,
      prompt: `Generate a complete Next.js 15 app as files.\n\n${allSpecs}\n\nOutput each file as:\n### FILE: src/app/page.tsx\n\`\`\`tsx\ncode here\n\`\`\``,
    });
    return { summary: 'Generated via Gemini fallback', demoUrl: null, webUrl: null, rawCode: text };
  }
}
```

---

## STEP 9: Image Generation (Parallel, Non-Blocking)

### src/lib/image-gen.ts
```typescript
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

export async function generateLogo(description: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: `Minimal modern logo for a SaaS startup. ${description}. Vector style, one accent color, no text.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || [])
      if (part.inlineData) return part.inlineData.data;
  } catch { /* graceful degradation */ }
  return null;
}

export async function generateCompetitiveVisual(company: string, competitors: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `2x2 competitive positioning chart. ${company} vs ${competitors}. Dark bg, colored dots, labels. Professional.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || [])
      if (part.inlineData) return part.inlineData.data;
  } catch {}
  return null;
}
```

Fire logo gen in PARALLEL with Research Agent. Fire competitive visual in PARALLEL with Product Agent. Never block the pipeline on images.

---

## STEP 10: Fundraising Kit + Pitch Deck

### FundraisingKit.tsx — Modal with 5 tabs
1. 🌐 **Live Product** — iframe/link to deployed URL, or "Deploy keys needed" message
2. 📊 **Pitch Deck** — PitchDeck component  
3. 🔍 **Market Research** — Research Agent markdown rendered beautifully
4. 🏗️ **Architecture** — Architect output (Mermaid code blocks render as diagrams if possible, otherwise raw)
5. 📜 **Decision Log** — Timeline of all gates, debates, overrides

### PitchDeck.tsx — 10 slides
Cover, Problem, Solution, Market Size, Product, Business Model, Competition, Traction, Team, Ask.
- Prev/Next buttons + keyboard arrow support
- Gradient backgrounds, large typography, real data from Research Agent
- If Nano Banana images are available: use them. Otherwise: styled React cards.

### Header button: "📊 Fundraising Kit" appears when phase === 'delivered'

---

## STEP 11: Approval Gates

### ApprovalGate.tsx — Floating card at bottom center of OfficeView
- Amber "⏸ Decision Required" header
- Question text from the agent
- Three buttons: Approve (green), Modify (gray, expands text input), Reject (red)
- **Auto-approve after 10 seconds** if no user action (keeps demo flowing)
- On decision: emit result, resume pipeline

Gates:
1. After Product Agent: "Approve this MVP scope?"
2. After Developer Agent: "Deploy to Vercel?"

---

## STEP 12: Deploy to Production

```bash
pnpm build          # Fix all TypeScript errors
vercel --prod       # Deploy to foundersim.vercel.app
```

Before deploying, make sure Vercel dashboard has:
- All env vars from .env.local set
- Fluid Compute enabled (Project Settings → Functions)

Test on production: type mission → CEO chat → agents run → Fundraising Kit renders → deployed app link works

---

## DESIGN SYSTEM

**Colors:**
- Background layers: `#08080e` → `#0c0c14` → `#12121a`
- Borders: `#1e1e2e` (default), `#2a2a3a` (hover)
- Text: `#e2e2f0` (primary), `#888` (secondary), `#555` (muted)
- Accent: `linear-gradient(135deg, #f59e0b, #ef4444)`
- Agent: CEO `#f59e0b`, Research `#3b82f6`, Product `#8b5cf6`, Architect `#06b6d4`, Dev `#10b981`

**Components:**
- Cards: `bg-[#12121a] border border-[#1e1e2e] rounded-lg p-4`
- Agent output cards: `border-l-4 border-[agentColor]`
- Buttons: gradient for primary, `#1a1a28` for secondary
- All interactive: `cursor-pointer` + hover state
- Transitions: 200ms ease-out
- Loading: skeleton pulse, never spinners

---

## ABSOLUTE RULES

1. NEVER use `any` type
2. NEVER hallucinate data — Research Agent MUST use Google Search
3. NEVER show raw JSON — always render as styled markdown
4. ALWAYS include loading and error states
5. ALWAYS use system prompts from AGENTS.md (copy into prompts.ts)
6. Spatial office UI is NON-NEGOTIABLE — it's the visual identity
7. v0 SDK is PRIMARY code gen. Gemini direct is FALLBACK only.
8. **If stuck on something > 5 minutes, skip it and move on. SHIP > PERFECT.**
9. The `foundersim-prototype.jsx` in the root is your visual reference. Match its look. Don't import it.
