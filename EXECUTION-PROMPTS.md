# EXECUTION-PROMPTS.md — The Actual Task Prompts

> These are the TASK prompts sent to each agent alongside the system prompt. The system prompt (in AGENTS.md) defines WHO the agent is. These prompts define WHAT they must do RIGHT NOW. Copy these into `src/lib/prompts.ts` as separate exported constants alongside the system prompts.

---

## Research Agent — Task Prompt

```typescript
export function buildResearchTaskPrompt(companyBrief: string): string {
  return `
You have a new assignment. A CEO just locked in this company direction:

---
${companyBrief}
---

Your job is to deliver a competitive intelligence report that would survive a partner review at McKinsey. This is not a summary. This is primary research.

DO THIS NOW:

1. SEARCH for every company that does something similar. Cast a wide net — direct competitors, adjacent players, and anyone a customer might consider as an alternative. I need at least 5, ideally 8.

2. For EACH competitor, VISIT THEIR ACTUAL WEBSITE. Go to their pricing page. Read their feature page. Don't guess from search snippets — read the source.

3. Build the competitive matrix. For each competitor:
   - Company name
   - What they actually do (one sentence, from their own website)
   - Pricing (EXACT plans and prices from their pricing page. If they hide pricing, say "Contact sales — pricing not public" and note the source URL)
   - Target customer (who is their homepage talking to?)
   - Key strength (what do their customers love? check review sites if needed)
   - Key weakness (what do people complain about? search "[company] complaints" or "[company] vs")
   - Source URL (the actual page you read this from)

4. IDENTIFY THE GAP. After analyzing all competitors, what specific problem is underserved? Not "there's room for innovation" — tell me exactly what pain point no existing product solves well and why.

5. BUILD THE CUSTOMER PERSONA. Not a demographic profile. A real person:
   - Give them a name
   - What's their job title?
   - What tool do they currently use (and why is it failing them)?
   - What would they Google when they're frustrated?
   - How much would they pay to make this pain go away?

6. SIZE THE MARKET. TAM/SAM/SOM with real numbers:
   - TAM: cite the industry report or data source
   - SAM: how did you narrow it? show your math
   - SOM: what's realistically capturable in year 1? be honest

FORMAT YOUR OUTPUT AS CLEAN MARKDOWN with the competitive matrix as a proper table.

CRITICAL RULES:
- If you cannot verify a price, write "UNVERIFIED" — never invent a number.
- Every single claim must have a source URL in parentheses.
- If a competitor's website is behind a login wall, say so and use what Google Search can surface.
- Do NOT pad the analysis with generic industry observations. Specific companies, specific prices, specific gaps.
- This report will be read by the Board of Directors. Make it worth their time.
`;
}
```

---

## Product Agent — Task Prompt

```typescript
export function buildProductTaskPrompt(companyBrief: string, competitiveAnalysis: string): string {
  return `
You have a new product to spec. Here's your context:

COMPANY BRIEF:
---
${companyBrief}
---

COMPETITIVE INTELLIGENCE (verified market data):
---
${competitiveAnalysis}
---

The Research team just handed you a competitive analysis with real data. Now turn it into a product that WINS.

DO THIS NOW:

1. DEFINE THE JOB. What job is the user hiring this product to do? Not the feature — the outcome. Not "create invoices" but "get paid without chasing clients." The job-to-be-done must connect directly to the gap the Research team identified.

2. IDENTIFY THE KILLER FEATURE. Look at the competitive matrix. What does EVERY competitor do poorly or not at all? That's your killer feature. This is the one thing you'd put on a billboard. If you can't articulate it in 8 words or fewer, you haven't found it yet.

3. SPEC THE MVP (max 5 features):
   For each feature:
   - Name (clear, not clever)
   - User Story: "As [the specific persona from Research], I want to [specific action] so that [measurable outcome]"
   - Acceptance Criteria (3-5 TESTABLE bullet points. Not "works well" — "reminder email sends exactly 3 days before due date with invoice amount in subject line")
   - Priority: P0 (ship breaks without it) or P1 (ship works but is weaker)
   - Why This Feature: trace it back to the competitive gap or persona pain

4. THE CUT LIST. What features are tempting but must wait? For each:
   - Feature name
   - Why it's tempting (what user need it serves)
   - Why it's cut (complexity, uncertain value, or dependency)
   - When to reconsider (what signal tells you it's time)

5. SUCCESS METRICS:
   - Primary metric: the ONE number (with a 90-day target)
   - Secondary metrics: 2-3 supporting numbers
   - Anti-metric: one thing you're explicitly NOT optimizing for and why

CRITICAL RULES:
- If you have 6 features, you have too many. Cut one and explain why.
- Every feature must trace to either (a) the competitive gap or (b) the persona's specific pain.
- If the CEO's brief is too ambitious for an MVP, say so: "This is a 6-month roadmap. Here's the 3-week version."
- User stories must be specific enough that a developer can build them without asking a single question.
- The killer feature must be in the product name or tagline. If it's buried in feature #4, you've lost.
`;
}
```

---

## Architect Agent — Task Prompt

```typescript
export function buildArchitectTaskPrompt(
  companyBrief: string, competitiveAnalysis: string, prd: string
): string {
  return `
You have a product to architect. Full context:

COMPANY BRIEF:
---
${companyBrief}
---

COMPETITIVE ANALYSIS (real market data):
---
${competitiveAnalysis}
---

PRODUCT REQUIREMENTS:
---
${prd}
---

The product team just handed you a tight PRD with 5 features and acceptance criteria. Now design a system that a solo developer can build in 2 weeks and that scales to 10,000 users without a rewrite.

DO THIS NOW:

1. TECH STACK DECISIONS. For each layer, choose ONE technology and give a ONE-SENTENCE reason that references this specific product (not generic "it's popular"):
   - Frontend: (hint: it's Next.js 15 App Router — you're deploying to Vercel)
   - Backend API: (Next.js API routes or Server Actions — pick one and say why for THIS product)
   - Database: (Supabase if key available, otherwise specify alternative)
   - Auth: (ONLY if the PRD requires user accounts or external API access — see rules)
   - Hosting: Vercel (non-negotiable)
   - AI Integration: Gemini 3.1 Pro via @google/genai SDK with Google Search + URL Context

2. AGENT ENDPOINT DESIGN. This product IS an AI agent. Design the core endpoint:
   - Route: POST /api/agent
   - Input interface (TypeScript): what JSON does it accept?
   - Output interface (TypeScript): what JSON does it return?
   - Processing pipeline: step-by-step what happens inside (which Gemini model, which tools, what transformations)
   - Error cases: what can go wrong and what does the response look like?

3. SYSTEM DIAGRAM (Mermaid). Generate a flowchart that a non-technical CEO can read:
   - Show: User → Web UI → /api/agent → Gemini (+ which tools) → Response
   - Include external services, database if applicable
   - Label the data flowing between each node

4. DATA MODEL (SQL). If the product stores any data:
   - CREATE TABLE statements with proper types, NOT NULL constraints, foreign keys
   - Comments explaining each table's purpose
   - If no persistent data needed, explicitly say "No database required — all processing is stateless"

5. ARCHITECTURE DECISION RECORDS. For every non-obvious choice:
   - Decision: what you chose
   - Alternatives: what else was on the table (at least 2)
   - Rationale: why this wins for THIS specific product (reference the PRD)
   - Risk: what could go wrong
   - Reversibility: how hard to change later (easy/medium/hard)

6. COMPONENT TREE. List every React component needed, organized by route:
   - / (landing page): Hero, Features, Pricing, CTA
   - /app or /dashboard: the main agent interface components
   - /api/agent: the agent route handler
   - Shared: Header, Footer, etc.

CRITICAL RULES:
- The /api/agent endpoint is NON-NEGOTIABLE. Every product is an agent first.
- The Mermaid diagram is NON-NEGOTIABLE. Judges need to see the system at a glance.
- If Supabase key is available, use Supabase. Don't waste time debating databases.
- Boring technology wins. Don't reach for Redis when localStorage works. Don't add WebSockets when polling is fine.
- Design for the acceptance criteria in the PRD. If a criterion says "results in under 10 seconds," your architecture must support that.
`;
}
```

---

## Developer Agent — Task Prompt (sent to v0 Platform API)

```typescript
export function buildDeveloperTaskPrompt(
  companyBrief: string, competitiveAnalysis: string, prd: string, architectureDoc: string
): string {
  return `
Build a complete, production-quality Next.js 15 application. You have the most detailed engineering brief any developer has ever received.

COMPANY:
---
${companyBrief}
---

MARKET RESEARCH (use this real data in ALL marketing copy, pricing, and competitor references):
---
${competitiveAnalysis}
---

PRODUCT REQUIREMENTS (implement every P0 feature as a functional page):
---
${prd}
---

ARCHITECTURE (follow exactly — tech stack, agent endpoint design, data model, component tree):
---
${architectureDoc}
---

BUILD PRIORITIES (in order):

1. BUILD THE AGENT FIRST: /api/agent route. This is the core product. It must:
   - Accept the input JSON schema from the Architecture Doc
   - Call Gemini API with the specified tools (Google Search, URL Context, etc.)
   - Return the output JSON schema from the Architecture Doc
   - Handle errors gracefully (return { error: "message" } with appropriate status codes)
   - Work headlessly — testable with curl

2. BUILD THE WEB UI: A beautiful interface that calls /api/agent and renders the response.
   - Landing page with hero section, value proposition, and a prominent input area
   - The input area should be the FIRST thing users see — not buried below the fold
   - Real-time loading state while the agent processes (skeleton UI, progress messages)
   - Beautiful rendering of the agent's structured output
   - All marketing copy uses REAL data from the Market Research (competitor names, real prices, real positioning)

3. POLISH:
   - Responsive (mobile-first)
   - Keyboard accessible
   - Error states with helpful messages
   - Meta tags for SEO and social sharing

DESIGN REQUIREMENTS:
- Apple-level craft: generous whitespace, 3-level type hierarchy, one accent color
- Headlines are benefit-focused ("Analyze any competitor in 30 seconds" not "Competitive Analysis Tool")
- CTAs are specific ("Paste a URL and see the magic" not "Get Started")
- Loading state should feel alive — streaming dots, subtle animations, progress text
- The output should be SCANNABLE — use cards, sections, clear headers, not a wall of text

USE shadcn/ui COMPONENTS for consistency.

CRITICAL RULES:
- No placeholder text anywhere. Real company name, real tagline, real descriptions from the Market Research.
- No TODO comments. No "implement later." Every function complete.
- Every page must render without errors.
- The /api/agent route must work independently of the UI.
- TypeScript strict — no \`any\`, no \`@ts-ignore\`.
`;
}
```

---

## CEO Agent — Task Prompt (for Company Brief generation, after conversation)

```typescript
export function buildCEOBriefPrompt(mission: string, conversationContext: string): string {
  return `
Based on our conversation, lock in the Company Brief.

The founder said: "${mission}"
${conversationContext ? `\nOur discussion:\n${conversationContext}` : ''}

Generate the Company Brief NOW. This document will be handed to a Research analyst, a Product manager, an Architect, and a Developer. It must be sharp enough that they can start working without asking you a single question.

FORMAT:
- Mission: (1 sentence, no buzzwords)
- Target Customer: (a specific person — name them, describe their day, their frustration, their current workaround)
- Pain Level: (hair-on-fire / important / nice-to-have — be brutally honest)
- Value Proposition: (what changes in their life — before/after)
- Wedge Product: (the smallest thing you'd ship in 2 weeks that one person would pay for)
- Key Metric: (the ONE number that tells you this is working, with a 90-day target)
- 10x Vision: (where this goes in 3 years if everything works)
- Why Now: (what changed in the market or technology that makes this possible TODAY)

Max 300 words. Every word must earn its place.
`;
}
```
