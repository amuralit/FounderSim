import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { RESEARCH_SYSTEM_PROMPT, buildResearchTaskPrompt } from '../prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

export async function runResearchAgent(companyBrief: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `${RESEARCH_SYSTEM_PROMPT}\n\n${buildResearchTaskPrompt(companyBrief)}`,
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });
  return response.text || '';
}
