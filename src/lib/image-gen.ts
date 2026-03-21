import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

export async function generateLogo(description: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: `Minimal modern logo for a SaaS startup. ${description}. Vector style, one accent color, no text.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data ?? null;
    }
  } catch (e) {
    console.error('Logo generation failed:', e);
  }
  return null;
}

export async function generateCompetitiveVisual(company: string, competitors: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `2x2 competitive positioning chart. ${company} vs ${competitors}. Dark bg, colored dots, labels. Professional.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data ?? null;
    }
  } catch (e) {
    console.error('Competitive visual generation failed:', e);
  }
  return null;
}
