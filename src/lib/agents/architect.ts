import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { ARCHITECT_SYSTEM_PROMPT, buildArchitectTaskPrompt } from '../prompts';

export async function runArchitectAgent(brief: string, research: string, prd: string): Promise<string> {
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseContext = hasSupabase
    ? '\n\nNote: Supabase credentials are available. Use Supabase for database, auth, and real-time features.'
    : '';

  const { text } = await generateText({
    model: google('gemini-3.1-pro-preview'),
    system: ARCHITECT_SYSTEM_PROMPT + supabaseContext,
    prompt: buildArchitectTaskPrompt(brief, research, prd),
  });
  return text;
}
