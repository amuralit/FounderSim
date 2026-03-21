import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { RESEARCH_SYSTEM_PROMPT, buildResearchTaskPrompt } from '../prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

// ── Structured Output Types ──

export interface Competitor {
  name: string;
  description: string;
  pricing: string;
  target: string;
  strength: string;
  weakness: string;
  sourceUrl: string;
}

export interface CustomerPersona {
  name: string;
  title: string;
  currentTool: string;
  frustration: string;
  searchQuery: string;
  willingness: string;
}

export interface MarketSize {
  tam: string;
  sam: string;
  som: string;
}

export interface ResearchOutput {
  competitors: Competitor[];
  marketGap: string;
  persona: CustomerPersona;
  marketSize: MarketSize;
  rawAnalysis: string;
}

// ── Parser Helpers ──

function extractTableRows(text: string): Competitor[] {
  const competitors: Competitor[] = [];

  // Match markdown table rows: lines starting with | that are not headers or separators
  const tableRowRegex = /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|?\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = tableRowRegex.exec(text)) !== null) {
    const cells = match.slice(1).map(c => c.trim());

    // Skip header rows and separator rows
    if (cells[0].toLowerCase().includes('company') || cells[0].match(/^-+$/)) continue;
    if (cells.every(c => c.match(/^[-:]+$/))) continue;

    competitors.push({
      name: cells[0] || 'Unknown',
      description: '', // Description not always in the table; populated below
      pricing: cells[1] || 'Not available',
      target: cells[2] || 'Not specified',
      strength: cells[3] || 'Not specified',
      weakness: cells[4] || 'Not specified',
      sourceUrl: cells[5] || '',
    });
  }

  // If the 6-column table didn't match, try alternative table formats
  // Some outputs use: | Company | What They Do | Price | Target | Strength | Weakness | Source |
  if (competitors.length === 0) {
    const altRowRegex = /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|?\s*$/gm;
    let altMatch: RegExpExecArray | null;

    while ((altMatch = altRowRegex.exec(text)) !== null) {
      const cells = altMatch.slice(1).map(c => c.trim());
      if (cells[0].toLowerCase().includes('company') || cells.every(c => c.match(/^[-:]+$/))) continue;

      competitors.push({
        name: cells[0] || 'Unknown',
        description: cells[1] || '',
        pricing: cells[2] || 'Not available',
        target: cells[3] || 'Not specified',
        strength: cells[4] || 'Not specified',
        weakness: cells[5] || 'Not specified',
        sourceUrl: cells[6] || '',
      });
    }
  }

  return competitors;
}

function extractSection(text: string, ...headingPatterns: string[]): string {
  for (const pattern of headingPatterns) {
    // Try to match a section starting with the heading pattern and ending before the next heading
    const regex = new RegExp(
      `(?:^|\\n)#+\\s*${pattern}[^\\n]*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`,
      'im'
    );
    const match = regex.exec(text);
    if (match && match[1].trim().length > 10) {
      return match[1].trim();
    }

    // Also try bold heading pattern: **Pattern**
    const boldRegex = new RegExp(
      `\\*\\*${pattern}[^*]*\\*\\*[:\\s]*([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|\\n#+\\s|$)`,
      'im'
    );
    const boldMatch = boldRegex.exec(text);
    if (boldMatch && boldMatch[1].trim().length > 10) {
      return boldMatch[1].trim();
    }
  }
  return '';
}

function parsePersona(text: string): CustomerPersona {
  const section = extractSection(text, 'Customer Persona', 'Persona', 'Target Customer', 'Ideal Customer');

  const defaults: CustomerPersona = {
    name: 'Unknown',
    title: 'Unknown',
    currentTool: 'Unknown',
    frustration: 'Unknown',
    searchQuery: 'Unknown',
    willingness: 'Unknown',
  };

  if (!section) return defaults;

  // Try to extract named fields
  const nameMatch = section.match(/(?:name|who)[:\s]*([^\n]+)/i);
  const titleMatch = section.match(/(?:title|role|job)[:\s]*([^\n]+)/i);
  const toolMatch = section.match(/(?:current(?:ly)?(?:\s+us(?:es?|ing))?|tool|using)[:\s]*([^\n]+)/i);
  const frustrationMatch = section.match(/(?:frustrat|pain|struggle|problem)[:\s]*([^\n]+)/i);
  const searchMatch = section.match(/(?:search|google|query)[:\s]*([^\n]+)/i);
  const willingnessMatch = section.match(/(?:pay|willing|budget|spend)[:\s]*([^\n]+)/i);

  return {
    name: nameMatch?.[1]?.trim() || defaults.name,
    title: titleMatch?.[1]?.trim() || defaults.title,
    currentTool: toolMatch?.[1]?.trim() || defaults.currentTool,
    frustration: frustrationMatch?.[1]?.trim() || defaults.frustration,
    searchQuery: searchMatch?.[1]?.trim() || defaults.searchQuery,
    willingness: willingnessMatch?.[1]?.trim() || defaults.willingness,
  };
}

function parseMarketSize(text: string): MarketSize {
  const defaults: MarketSize = { tam: 'Not estimated', sam: 'Not estimated', som: 'Not estimated' };

  const tamMatch = text.match(/TAM[:\s]*([^\n]+)/i);
  const samMatch = text.match(/SAM[:\s]*([^\n]+)/i);
  const somMatch = text.match(/SOM[:\s]*([^\n]+)/i);

  return {
    tam: tamMatch?.[1]?.trim() || defaults.tam,
    sam: samMatch?.[1]?.trim() || defaults.sam,
    som: somMatch?.[1]?.trim() || defaults.som,
  };
}

function parseMarketGap(text: string): string {
  const section = extractSection(text, 'Market Gap', 'Gap', 'What.s Missing', 'Opportunity', 'Underserved');
  if (section) return section;

  // Fallback: look for the gap sentence pattern
  const gapMatch = text.match(/(?:gap|missing|underserved|opportunity)[:\s]*([^\n]+(?:\n(?![#*|])[^\n]+)*)/i);
  return gapMatch?.[1]?.trim() || 'No specific market gap identified in the analysis.';
}

/**
 * Parse the raw markdown research output into a structured ResearchOutput.
 * Uses regex-based extraction with graceful fallbacks for each section.
 */
export function parseResearchOutput(text: string): ResearchOutput {
  const competitors = extractTableRows(text);
  const marketGap = parseMarketGap(text);
  const persona = parsePersona(text);
  const marketSize = parseMarketSize(text);

  return {
    competitors,
    marketGap,
    persona,
    marketSize,
    rawAnalysis: text,
  };
}

/**
 * Run the Research Agent using Google Search + URL Context for real competitor data.
 * Returns structured ResearchOutput with parsed competitors, persona, market sizing,
 * and the raw markdown analysis.
 */
export async function runResearchAgent(companyBrief: string): Promise<ResearchOutput> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `${RESEARCH_SYSTEM_PROMPT}\n\n${buildResearchTaskPrompt(companyBrief)}`,
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  const rawText = response.text || '';
  return parseResearchOutput(rawText);
}
