'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PitchDeck from './PitchDeck';
import { DecisionEntry } from '@/lib/agents/types';

interface FundraisingKitProps {
  researchOutput: string;
  architectOutput: string;
  demoUrl: string | null;
  webUrl: string | null;
  logoBase64: string | null;
  competitiveVisualBase64?: string | null;
  decisions: DecisionEntry[];
  companyBrief: string;
  productOutput: string;
  onClose: () => void;
}

const TABS = [
  { id: 'product', label: 'Live Product', icon: '🌐' },
  { id: 'pitch', label: 'Pitch Deck', icon: '📊' },
  { id: 'research', label: 'Market Research', icon: '🔍' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  { id: 'decisions', label: 'Decision Log', icon: '📜' },
] as const;

type TabId = typeof TABS[number]['id'];

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')                    // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // bold
    .replace(/\*([^*]+)\*/g, '$1')                // italic
    .replace(/`([^`]+)`/g, '$1')                  // inline code
    .replace(/^\s*[-*]\s+/gm, '• ')               // bullets
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // links
    .replace(/\|.*\|/g, '')                        // table rows
    .replace(/^---+$/gm, '')                       // horizontal rules
    .replace(/\n{3,}/g, '\n\n')                    // collapse excess newlines
    .trim();
}

function extractField(text: string, ...patterns: string[]): string {
  for (const p of patterns) {
    const regex = new RegExp(`${p}[:\\s]*([^\\n]+(?:\\n(?![A-Z#][a-z]*[:\\s])[^\\n]+)*)`, 'im');
    const match = regex.exec(text);
    if (match && match[1].trim().length > 10) return stripMarkdown(match[1].trim());
  }
  return '';
}

function generatePitchSlides(brief: string, research: string, product: string): { title: string; subtitle?: string; body?: string; bg?: string }[] {
  const slides: { title: string; subtitle?: string; body?: string; bg?: string }[] = [];

  // Cover slide
  const mission = extractField(brief, 'Mission') || extractField(brief, 'Company Name');
  slides.push({
    title: mission ? mission.split('.')[0] : 'Our Mission',
    subtitle: 'Built by AI agents, guided by humans',
    bg: 'linear-gradient(135deg, #0f172a, #1e293b)',
  });

  // Problem
  const pain = extractField(brief, 'Pain Level', 'Pain');
  const target = extractField(brief, 'Target Customer', 'Target');
  if (pain || target) {
    slides.push({ title: 'The Problem', body: [target, pain].filter(Boolean).join('\n\n') });
  }

  // Solution
  const valueProp = extractField(brief, 'Value Proposition', 'Value Prop');
  const wedge = extractField(brief, 'Wedge Product', 'Wedge');
  if (valueProp || wedge) {
    slides.push({ title: 'The Solution', body: [valueProp, wedge].filter(Boolean).join('\n\n') });
  }

  // Market Size (only with real data)
  const tam = extractField(research, 'TAM');
  const sam = extractField(research, 'SAM');
  const som = extractField(research, 'SOM');
  if (tam || sam || som) {
    slides.push({
      title: 'Market Size',
      body: [tam && `TAM: ${tam}`, sam && `SAM: ${sam}`, som && `SOM: ${som}`].filter(Boolean).join('\n'),
    });
  }

  // Product
  const killer = extractField(product, 'Killer Feature', 'killerFeature');
  const jobToBeDone = extractField(product, 'Jobs?.to.Be.Done', 'jobToBeDone', 'Job');
  if (killer || jobToBeDone) {
    slides.push({
      title: 'The Product',
      body: [killer, jobToBeDone].filter(Boolean).join('\n\n'),
    });
  }

  // Competition / Our Edge
  const gap = extractField(research, 'Market Gap', 'Gap', 'What.*Missing');
  if (gap) {
    slides.push({ title: 'Our Edge', body: gap });
  }

  // Why Now
  const whyNow = extractField(brief, 'Why Now');
  if (whyNow) {
    slides.push({ title: 'Why Now', body: whyNow });
  }

  // Vision
  const metric = extractField(brief, 'Key Metric');
  const vision = extractField(brief, '10x Vision');
  if (metric || vision) {
    slides.push({
      title: 'The Vision',
      body: [metric && `Key Metric: ${metric}`, vision].filter(Boolean).join('\n\n'),
    });
  }

  // Ask (always include)
  slides.push({
    title: 'The Ask',
    body: 'Raising pre-seed to capture this market window.\n\nUse of funds:\n• Engineering (60%)\n• Go-to-market (25%)\n• Operations (15%)',
  });

  return slides;
}

export default function FundraisingKit({
  researchOutput, architectOutput, demoUrl, webUrl, logoBase64,
  competitiveVisualBase64, decisions, companyBrief, productOutput, onClose,
}: FundraisingKitProps) {
  const [activeTab, setActiveTab] = useState<TabId>('product');
  const [showPitchDeck, setShowPitchDeck] = useState(false);

  const pitchSlides = generatePitchSlides(companyBrief, researchOutput, productOutput);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
      >
        <div
          className="w-[90%] max-w-[1000px] h-[80vh] overflow-hidden flex flex-col"
          style={{ background: '#FFFFFF', border: '1px solid #E8EAF0', borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E8EAF0' }}>
            <div className="flex items-center gap-3">
              {logoBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/png;base64,${logoBase64}`} alt="Logo" className="w-8 h-8 rounded" />
              )}
              <h2 className="text-lg font-bold" style={{ color: '#111827' }}>Fundraising Kit</h2>
            </div>
            <button onClick={onClose} className="text-xl cursor-pointer" style={{ background: 'none', border: 'none', color: '#9CA3AF' }}>✕</button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 gap-1 pt-2" style={{ borderBottom: '1px solid #E8EAF0' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 text-xs font-medium rounded-t-lg cursor-pointer transition-colors"
                style={{
                  background: 'transparent',
                  color: activeTab === tab.id ? '#f59e0b' : '#9CA3AF',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'product' && (
              <div className="text-center py-10">
                {demoUrl ? (
                  <div>
                    <div className="text-4xl mb-4">🚀</div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Your Product is Live!</h3>
                    <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="text-[#f59e0b] underline text-lg">{demoUrl}</a>
                    <div className="mt-6 rounded-xl overflow-hidden" style={{ border: '1px solid #E8EAF0' }}>
                      <iframe src={demoUrl} className="w-full h-[400px]" title="Live Product" />
                    </div>
                  </div>
                ) : webUrl ? (
                  <div>
                    <div className="text-4xl mb-4">💻</div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>App Building on v0</h3>
                    <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                      v0 is building your app. Click below to see progress and get the deploy URL.
                    </p>
                    <a
                      href={webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 4px 16px rgba(245,158,11,0.25)' }}
                    >
                      Open in v0 →
                    </a>
                    <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
                      Once v0 finishes building, click &quot;Publish&quot; in v0 to get your live URL
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">🔧</div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Code Generated</h3>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>Add deploy keys to deploy to Vercel</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pitch' && (
              <div className="text-center py-10">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold mb-4" style={{ color: '#111827' }}>Pitch Deck</h3>
                <button
                  onClick={() => setShowPitchDeck(true)}
                  className="px-6 py-3 rounded-lg font-semibold text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                >
                  Open Full Presentation →
                </button>
                <div className="mt-6 grid grid-cols-5 gap-2">
                  {pitchSlides.map((slide, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3 text-[10px] cursor-pointer"
                      style={{ background: '#F8F9FB', border: '1px solid #E8EAF0' }}
                      onClick={() => { setShowPitchDeck(true); }}
                    >
                      {i === 0 && logoBase64 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/png;base64,${logoBase64}`}
                          alt="Logo"
                          className="w-6 h-6 rounded mb-1 mx-auto"
                        />
                      )}
                      <div className="font-bold truncate" style={{ color: '#f59e0b' }}>{slide.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'research' && (
              <div>
                {competitiveVisualBase64 && (
                  <div className="mb-6 rounded-xl overflow-hidden flex justify-center p-4" style={{ background: '#F8F9FB', border: '1px solid #E8EAF0' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${competitiveVisualBase64}`}
                      alt="Competitive positioning"
                      className="max-w-full max-h-[300px] rounded-lg"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    />
                  </div>
                )}
                <div className="md-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{researchOutput || 'Research data not yet available.'}</ReactMarkdown>
                </div>
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className="md-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{architectOutput || 'Architecture document not yet available.'}</ReactMarkdown>
              </div>
            )}

            {activeTab === 'decisions' && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: '#9CA3AF' }}>Decision Timeline</h3>
                {decisions.length === 0 ? (
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>No decisions logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {decisions.map((d, i) => (
                      <div
                        key={i}
                        className="flex gap-3 rounded-lg p-3"
                        style={{ background: '#F8F9FB', border: '1px solid #E8EAF0' }}
                      >
                        <div className="text-[11px] shrink-0 font-mono" style={{ color: '#9CA3AF' }}>
                          {new Date(d.ts).toLocaleTimeString()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold capitalize" style={{ color: '#f59e0b' }}>{d.agent}</span>
                          <span className="text-xs mx-2" style={{ color: '#D1D5DB' }}>·</span>
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>{d.type}</span>
                          <div className="text-xs mt-1" style={{ color: '#374151' }}>{d.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPitchDeck && <PitchDeck slides={pitchSlides} onClose={() => setShowPitchDeck(false)} />}
    </>
  );
}
