import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { CEO_SYSTEM_PROMPT, buildCEOBriefPrompt } from '../prompts';
import { ChatMessage } from './types';

export async function runCeoChat(mission: string, history: ChatMessage[]): Promise<{ text: string; briefReady: boolean; brief?: string }> {
  const messages = history.map(m => ({
    role: m.from === 'user' ? 'user' as const : 'assistant' as const,
    content: m.text,
  }));

  const goKeywords = ['go', 'start', 'build', 'proceed', 'do it', 'let\'s go', 'ship it', 'run', 'yes', 'approved', 'lgtm', 'looks good', 'perfect', 'love it', 'ship'];
  const lastUserMsg = history.filter(m => m.from === 'user').pop();
  const userWantsToGo = lastUserMsg && goKeywords.some(k => lastUserMsg.text.toLowerCase().includes(k));

  // Only treat as "go" signal if this is NOT the first message (user has seen the brief already)
  const isFirstMessage = history.filter(m => m.from === 'user').length <= 1;
  const shouldGenerateBrief = userWantsToGo && !isFirstMessage;

  const conversationContext = history.map(m => `${m.from === 'user' ? 'Board' : 'Ada'}: ${m.text}`).join('\n');

  let prompt: string;
  if (shouldGenerateBrief) {
    prompt = buildCEOBriefPrompt(mission, conversationContext);
  } else if (isFirstMessage) {
    // First message: Ada should respond with her take AND include the brief
    prompt = `New mission from the Board: "${mission}".

You MUST respond with your strategic take AND include the Company Brief in the SAME response. Be decisive. Don't just ask questions — make a call and present the brief. Keep it under 250 words total. Use plain text only, no markdown formatting.`;
  } else {
    prompt = messages[messages.length - 1].content;
  }

  const { text } = await generateText({
    model: google('gemini-3.1-pro-preview'),
    system: CEO_SYSTEM_PROMPT,
    messages: [
      ...messages.slice(0, -1),
      { role: 'user', content: prompt },
    ],
  });

  // Check if response contains a brief (has the key sections)
  const hasBrief = text.includes('Mission:') && text.includes('Target Customer:') && text.includes('Value Proposition:');

  if (hasBrief) {
    // Polish the brief — remove boilerplate, clean formatting
    let polishedBrief = text
      .replace(/This is where I['']d take this\.?.*$/gm, '')
      .replace(/Adjustments before I send the team to work\??/gi, '')
      .replace(/Say ['"]go['"].*$/gim, '')
      .replace(/Click Build Now.*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (shouldGenerateBrief) {
      return { text: polishedBrief, briefReady: true, brief: polishedBrief };
    }

    if (isFirstMessage) {
      return { text: polishedBrief, briefReady: false, brief: polishedBrief };
    }
  }

  return { text, briefReady: false };
}
