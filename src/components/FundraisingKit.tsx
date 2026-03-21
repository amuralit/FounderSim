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

function generatePitchSlides(brief: string, research: string, product: string): { title: string; subtitle?: string; body?: string; bg?: string }[] {
  const missionMatch = brief.match(/Mission[:\s]*(.+?)(?:\n|$)/i);
  const mission = missionMatch?.[1]?.trim() || 'Building the future';

  return [
    { title: mission.split('.')[0] || 'Our Mission', subtitle: 'From idea to investor-ready', bg: 'linear-gradient(135deg, #0f172a, #1e293b)' },
    { title: 'The Problem', body: brief.match(/Pain[^:]*[:\s]*(.+?)(?:\n|$)/i)?.[1] || 'A critical pain point that needs solving.' },
    { title: 'The Solution', body: brief.match(/Value Prop[^:]*[:\s]*(.+?)(?:\n|$)/i)?.[1] || 'Our unique approach to the problem.' },
    { title: 'Market Size', body: research.match(/TAM[\s\S]*?SOM[^\n]*/i)?.[0] || 'Large and growing market opportunity.' },
    { title: 'The Product', body: product.match(/MVP Features[\s\S]*?(?=Cut List|Success|$)/i)?.[0]?.substring(0, 300) || 'Core features that deliver value.' },
    { title: 'Competition', body: research.match(/Competitive Matrix[\s\S]*?(?=Market Gap|Customer|$)/i)?.[0]?.substring(0, 400) || 'Clear competitive advantages.' },
    { title: 'Business Model', body: 'Freemium → Pro → Enterprise\nLand and expand strategy' },
    { title: 'Traction', body: 'Built from idea to deployed product using AI agents.\nReal database. Real deployment. Real product.' },
    { title: 'The Team', body: '5 AI agents + human oversight\nResearch, Product, Architecture, Development, CEO' },
    { title: 'The Ask', body: 'Raising pre-seed to capture this market window.\nUse of funds: Engineering (60%), GTM (25%), Ops (15%)' },
  ];
}

export default function FundraisingKit({
  researchOutput, architectOutput, demoUrl, webUrl, logoBase64,
  decisions, companyBrief, productOutput, onClose,
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
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Code Generated</h3>
                    <a href={webUrl} target="_blank" rel="noopener noreferrer" className="text-[#10b981] underline">{webUrl}</a>
                    <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>View and edit the generated code on v0</p>
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
                      <div className="font-bold truncate" style={{ color: '#f59e0b' }}>{slide.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'research' && (
              <div className="prose prose-sm max-w-none" style={{ color: '#374151' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{researchOutput || 'Research data not yet available.'}</ReactMarkdown>
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className="prose prose-sm max-w-none" style={{ color: '#374151' }}>
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
