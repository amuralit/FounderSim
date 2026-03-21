import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { PRODUCT_SYSTEM_PROMPT, buildProductTaskPrompt } from '../prompts';

export async function runProductAgent(brief: string, research: string): Promise<string> {
  const { text } = await generateText({
    model: google('gemini-3.1-pro-preview'),
    system: PRODUCT_SYSTEM_PROMPT,
    prompt: buildProductTaskPrompt(brief, research),
  });
  return text;
}
