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

export async function generateMarketMap(companyName: string, competitors: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: `Create a clean market landscape map infographic. Show "${companyName}" positioned in the center with competitors around it: ${competitors}. Use a professional style with clean typography, dark blue background, white text, colored nodes for each company. Show positioning on axes of Price (low to high) vs Features (basic to advanced). Modern, minimal SaaS style.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data ?? null;
    }
  } catch (e) {
    console.error('Market map generation failed:', e);
  }
  return null;
}

export async function generateArchitectureDiagram(description: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: `Create a clean system architecture diagram for a SaaS product. ${description}. Show the flow from User to Frontend to API to Database with icons for each service. Use a modern tech company style with subtle gradients, clean lines, and labeled components. White background, professional look.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data ?? null;
    }
  } catch (e) {
    console.error('Architecture diagram generation failed:', e);
  }
  return null;
}

export async function generateProductMockup(productName: string, features: string): Promise<string | null> {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `Create a clean UI mockup screenshot for a SaaS product called "${productName}". Key features: ${features}. Show a modern dashboard view with sidebar navigation, main content area with data cards and a chart. Use Apple-level design with generous whitespace, subtle shadows, and one accent color. Light theme, professional.`,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    for (const part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data ?? null;
    }
  } catch (e) {
    console.error('Product mockup generation failed:', e);
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
