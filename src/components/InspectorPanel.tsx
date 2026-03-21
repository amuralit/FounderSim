'use client';

import { useState, useRef, useEffect, useMemo, useCallback, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentDef, AgentId, ChatMessage } from '@/lib/agents/types';

interface InspectorPanelProps {
  agent: AgentDef;
  output: string | null;
  chatHistory: ChatMessage[];
  onSendMessage: (agentId: AgentId, message: string) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Agent-specific role emoji for the empty state */
const roleEmoji: Record<AgentId, string> = {
  ceo: '\u{1F3AF}',       // direct hit
  research: '\u{1F50D}',  // magnifying glass
  product: '\u{1F4CB}',   // clipboard
  architect: '\u{1F3D7}', // building construction
  developer: '\u{1F680}', // rocket
};

/** Parse CEO brief into structured sections */
function parseBrief(text: string): { intro: string; fields: { label: string; value: string }[]; outro: string } | null {
  const labels = ['Mission', 'Target Customer', 'Pain Level', 'Value Proposition', 'Wedge Product', 'Key Metric', '10x Vision', 'Why Now'];
  const hasField = labels.filter(l => text.includes(`${l}:`)).length >= 4;
  if (!hasField) return null;

  const fields: { label: string; value: string }[] = [];
  let intro = '';
  let outro = '';

  // Find first field position for intro
  const firstIdx = Math.min(...labels.map(l => { const i = text.indexOf(`${l}:`); return i === -1 ? Infinity : i; }));
  if (firstIdx > 0) intro = text.substring(0, firstIdx).trim();

  for (let i = 0; i < labels.length; i++) {
    const start = text.indexOf(`${labels[i]}:`);
    if (start === -1) continue;
    const valueStart = start + labels[i].length + 1;
    // Find next field or end
    let end = text.length;
    for (let j = i + 1; j < labels.length; j++) {
      const nextIdx = text.indexOf(`${labels[j]}:`, valueStart);
      if (nextIdx !== -1) { end = nextIdx; break; }
    }
    fields.push({ label: labels[i], value: text.substring(valueStart, end).trim() });
  }

  // Check for outro after last field
  const lastField = fields[fields.length - 1];
  if (lastField) {
    const lastEnd = text.indexOf(lastField.value) + lastField.value.length;
    const remaining = text.substring(lastEnd).trim();
    if (remaining) outro = remaining;
  }

  return fields.length > 0 ? { intro, fields, outro } : null;
}

const briefIcons: Record<string, string> = {
  'Mission': '🎯', 'Target Customer': '👤', 'Pain Level': '🔥',
  'Value Proposition': '💎', 'Wedge Product': '🔨', 'Key Metric': '📊',
  '10x Vision': '🚀', 'Why Now': '⚡',
};

const painColors: Record<string, string> = {
  'hair-on-fire': '#ef4444', 'important': '#f59e0b', 'nice-to-have': '#6b7280',
};

function BriefCard({ text, color }: { text: string; color: string }) {
  const parsed = parseBrief(text);
  if (!parsed) {
    return <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#ccc' }}>{text}</div>;
  }

  return (
    <div className="space-y-2">
      {parsed.intro && (
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#bbb' }}>{parsed.intro}</p>
      )}
      <div className="grid gap-2">
        {parsed.fields.map((f, i) => {
          const painColor = f.label === 'Pain Level' ? painColors[f.value.toLowerCase()] : undefined;
          return (
            <div
              key={i}
              className="rounded-lg px-3.5 py-2.5 flex items-start gap-2.5"
              style={{ background: '#ffffff05', border: '1px solid #ffffff08' }}
            >
              <span className="text-sm mt-0.5 shrink-0">{briefIcons[f.label] || '•'}</span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: `${color}99` }}>
                  {f.label}
                </div>
                <div className="text-[13px] leading-relaxed" style={{ color: painColor || '#ddd' }}>
                  {f.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {parsed.outro && (
        <p className="text-[12px] mt-3 italic" style={{ color: '#888' }}>{parsed.outro}</p>
      )}
    </div>
  );
}

/** Contextual placeholder per agent */
function chatPlaceholder(agent: AgentDef): string {
  const first = agent.name.split(' ')[0];
  const map: Record<AgentId, string> = {
    ceo: `Ask ${first} about strategy...`,
    research: `Ask ${first} about market data...`,
    product: `Ask ${first} about features...`,
    architect: `Ask ${first} about tech decisions...`,
    developer: `Ask ${first} about the implementation...`,
  };
  return map[agent.id] ?? `Message ${first}...`;
}

/* ------------------------------------------------------------------ */
/*  Typing indicator                                                  */
/* ------------------------------------------------------------------ */

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[5px] h-[5px] rounded-full"
          style={{
            backgroundColor: color,
            opacity: 0.7,
            animation: `bounce-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function InspectorPanel({
  agent,
  output,
  chatHistory,
  onSendMessage,
  onClose,
}: InspectorPanelProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Detect "sending" state: after user sends until a new agent reply appears
  const lastMsg = chatHistory[chatHistory.length - 1];
  useEffect(() => {
    if (lastMsg && lastMsg.from !== 'user') {
      setIsSending(false);
    }
  }, [lastMsg]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(agent.id, trimmed);
    setInput('');
    setIsSending(true);
  }, [input, agent.id, onSendMessage]);

  // Memoised markdown components (avoids re-creating on each render)
  const mdComponents = useMemo(
    () => buildMarkdownComponents(agent.color),
    [agent.color],
  );

  /* ---- Derived status ---- */
  const isWorking = output === null;
  const statusLabel = isWorking ? 'Awaiting' : 'Completed';
  const statusDotColor = isWorking ? '#555' : '#22c55e';

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        animation: 'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* ========== Header ========== */}
      <div
        className="flex items-center gap-3.5 px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Avatar 48px */}
        <div
          className="w-12 h-12 rounded-full overflow-hidden shrink-0 transition-shadow duration-200"
          style={{
            border: `2.5px solid ${agent.color}`,
            boxShadow: `0 0 12px ${agent.color}25`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
        </div>

        {/* Name + role badge + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[15px] text-[var(--text-primary)] truncate">
              {agent.name}
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: `${agent.color}18`,
                color: agent.color,
                border: `1px solid ${agent.color}30`,
              }}
            >
              {agent.role}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="block w-2 h-2 rounded-full shrink-0 transition-colors duration-300"
              style={{ backgroundColor: statusDotColor }}
            />
            <span className="text-[11px] text-[var(--text-muted)]">{statusLabel}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150 cursor-pointer hover:bg-[#1a1a28]"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
          aria-label="Close inspector"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>

      {/* Personality quote */}
      <div
        className="px-5 py-2.5 text-[11px] italic text-[var(--text-muted)] tracking-wide"
        style={{
          borderBottom: '1px solid var(--border)',
          borderLeft: `3px solid ${agent.color}30`,
          marginLeft: 0,
        }}
      >
        &ldquo;{agent.personality}&rdquo;
      </div>

      {/* ========== Scrollable content ========== */}
      <div
        ref={outputScrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* --- Output section --- */}
        {output ? (
          <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1 h-4 rounded-full"
                style={{ backgroundColor: agent.color }}
              />
              <h3
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: agent.color }}
              >
                Agent Output
              </h3>
            </div>

            {/* Output card with left accent border */}
            <div
              className="rounded-lg overflow-hidden transition-colors duration-200"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeftWidth: '3px',
                borderLeftColor: agent.color,
              }}
            >
              <div className="p-4 text-[13px] leading-[1.75]">
                {agent.id === 'ceo' ? (
                  <BriefCard text={output} color={agent.color} />
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={mdComponents}
                    >
                      {output}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* --- Empty state --- */
          <div className="flex flex-col items-center justify-center py-16 select-none">
            <div
              className="text-5xl mb-4"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              {roleEmoji[agent.id]}
            </div>
            <div className="text-sm font-medium text-[var(--text-muted)] mb-1">
              Waiting for assignment...
            </div>
            <div className="text-[11px] text-[#444]">
              {agent.name.split(' ')[0]} is standing by
            </div>
            <style jsx>{`
              @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
            `}</style>
          </div>
        )}

        {/* --- Chat history --- */}
        {chatHistory.length > 0 && (
          <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-[var(--text-muted)]" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Conversation
              </h3>
            </div>

            <div className="space-y-2.5">
              {chatHistory.map((msg, i) => {
                const isUser = msg.from === 'user';
                return (
                  <div
                    key={i}
                    className="flex gap-2"
                    style={{
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      animation: 'fade-in 0.25s ease-out',
                    }}
                  >
                    {/* Agent mini avatar (left side) */}
                    {!isUser && (
                      <div
                        className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-1"
                        style={{ border: `1.5px solid ${agent.color}50` }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={agent.avatar} alt="" className="w-full h-full" />
                      </div>
                    )}

                    <div className="flex flex-col max-w-[80%]" style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                      <div
                        className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed transition-colors duration-150"
                        style={
                          isUser
                            ? {
                                background: 'linear-gradient(135deg, #f59e0b18, #ef444418)',
                                color: '#f0d9a8',
                                border: '1px solid #f59e0b20',
                                borderBottomRightRadius: '6px',
                              }
                            : {
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderLeft: `3px solid ${agent.color}60`,
                                borderBottomLeftRadius: '6px',
                              }
                        }
                      >
                        {!isUser && parseBrief(msg.text) ? (
                          <BriefCard text={msg.text} color={agent.color} />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        )}
                      </div>
                      {/* Timestamp */}
                      <span className="text-[9px] text-[#444] mt-1 px-1">
                        {relativeTime(msg.ts)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isSending && (
                <div className="flex gap-2" style={{ animation: 'fade-in 0.2s ease-out' }}>
                  <div
                    className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-1"
                    style={{ border: `1.5px solid ${agent.color}50` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={agent.avatar} alt="" className="w-full h-full" />
                  </div>
                  <div
                    className="rounded-2xl"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${agent.color}60`,
                    }}
                  >
                    <TypingIndicator color={agent.color} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* ========== Chat input ========== */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={chatPlaceholder(agent)}
          className="flex-1 px-4 py-2.5 rounded-full text-[13px] outline-none transition-all duration-200 placeholder:text-[#444]"
          style={{
            background: '#14141e',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = `${agent.color}50`;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${agent.color}15`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-default"
          style={{
            background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
            border: 'none',
            boxShadow: input.trim() ? `0 2px 10px ${agent.color}40` : 'none',
          }}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Markdown components with agent-colored styling             */
/* ------------------------------------------------------------------ */

function buildMarkdownComponents(agentColor: string) {
  return {
    h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
      <h1
        className="text-xl font-bold mt-5 mb-3 pb-2"
        style={{ color: agentColor, borderBottom: `1px solid ${agentColor}25` }}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
      <h2
        className="text-base font-bold mt-4 mb-2"
        style={{ color: agentColor }}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
      <h3
        className="text-sm font-semibold mt-3 mb-1.5"
        style={{ color: `${agentColor}dd` }}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: ComponentPropsWithoutRef<'h4'>) => (
      <h4
        className="text-[13px] font-semibold mt-2 mb-1"
        style={{ color: `${agentColor}cc` }}
        {...props}
      >
        {children}
      </h4>
    ),
    p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
      <p className="mb-3 text-[#bbb] text-[13px] leading-[1.75]" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
      <ul className="mb-3 ml-4 space-y-1.5 list-disc marker:text-[#555]" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
      <ol className="mb-3 ml-4 space-y-1.5 list-decimal marker:text-[#555]" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
      <li className="text-[13px] text-[#bbb] leading-[1.7] pl-1" {...props}>
        {children}
      </li>
    ),
    a: ({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-colors duration-150 hover:brightness-125"
        style={{ color: agentColor }}
        {...props}
      >
        {children}
      </a>
    ),
    strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
      <strong className="font-semibold text-[var(--text-primary)]" {...props}>
        {children}
      </strong>
    ),
    blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote
        className="my-3 pl-3.5 py-1 text-[12px] italic text-[#888] rounded-r-md"
        style={{ borderLeft: `3px solid ${agentColor}40`, background: `${agentColor}08` }}
        {...props}
      >
        {children}
      </blockquote>
    ),
    hr: (props: ComponentPropsWithoutRef<'hr'>) => (
      <hr className="my-4 border-0 h-px bg-[var(--border)]" {...props} />
    ),
    code: ({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) => {
      // Detect fenced code blocks (they have a className like "language-xyz")
      const isBlock = typeof className === 'string' && className.startsWith('language-');
      if (isBlock) {
        const lang = className?.replace('language-', '') ?? '';
        return (
          <div className="my-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Language tag */}
            {lang && (
              <div
                className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider"
                style={{
                  background: `${agentColor}12`,
                  color: `${agentColor}99`,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {lang}
              </div>
            )}
            <pre className="p-3.5 overflow-x-auto text-[12px] leading-[1.7] m-0" style={{ background: '#0a0a12' }}>
              <code className="font-mono text-[#c8c8d8]" {...props}>{children}</code>
            </pre>
          </div>
        );
      }
      // Inline code
      return (
        <code
          className="px-1.5 py-0.5 rounded text-[12px] font-mono"
          style={{
            background: `${agentColor}12`,
            color: `${agentColor}cc`,
            border: `1px solid ${agentColor}20`,
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }: ComponentPropsWithoutRef<'pre'>) => {
      // The code component handles pre styling already for block code,
      // but we need a passthrough for the wrapper
      return <>{children}</>;
    },
    table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
      <div className="my-3 overflow-x-auto rounded-lg" style={{ border: `1px solid ${agentColor}25` }}>
        <table className="w-full text-[12px] border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
      <thead style={{ background: `${agentColor}10` }} {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
      <th
        className="text-left px-3 py-2 font-semibold text-[11px] uppercase tracking-wider"
        style={{
          color: agentColor,
          borderBottom: `1px solid ${agentColor}30`,
        }}
        {...props}
      >
        {children}
      </th>
    ),
    tr: ({ children, ...props }: ComponentPropsWithoutRef<'tr'>) => (
      <tr
        className="transition-colors duration-100 even:bg-[#ffffff04] hover:bg-[#ffffff08]"
        style={{ borderBottom: '1px solid #1e1e2e' }}
        {...props}
      >
        {children}
      </tr>
    ),
    td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
      <td className="px-3 py-2 text-[#bbb]" {...props}>
        {children}
      </td>
    ),
  };
}
