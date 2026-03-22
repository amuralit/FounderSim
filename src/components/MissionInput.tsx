'use client';

import { useState } from 'react';

interface MissionInputProps {
  onSubmit: (mission: string) => void;
}

const SEEDER_PROMPTS = [
  {
    label: 'Sales Battle Card Agent',
    prompt: 'An AI agent that turns any competitor URL into a sales battle card — paste a URL, get a structured breakdown of their strengths, weaknesses, pricing, objection handling scripts, trap questions to ask prospects, and win strategies. Real-time data from their actual website. Replaces $20K/yr tools like Klue and Crayon with a self-serve agent.',
  },
  {
    label: 'Stock Research Agent',
    prompt: 'An AI agent that takes any stock ticker and instantly generates a Wall Street-quality research brief — real-time news sentiment, bull vs bear cases with evidence, competitor comparison with live market data, and key risk factors. Like having a Goldman Sachs analyst on demand.',
  },
  {
    label: 'Company Tear-Down Agent',
    prompt: 'An AI agent that takes any company website URL and generates a complete due diligence tear-down in 60 seconds — business model analysis, revenue stream identification, tech stack detection, hiring signals from job postings, competitive positioning, and strategic weaknesses.',
  },
];

export default function MissionInput({ onSubmit }: MissionInputProps) {
  const [mission, setMission] = useState('');

  const handleSubmit = () => {
    if (mission.trim()) onSubmit(mission.trim());
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'rgba(248,249,251,0.95)', backdropFilter: 'blur(40px)' }}>
      <div className="relative z-10 text-center max-w-[600px] w-full px-6">
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              F
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>FounderSim</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-[40px] font-bold leading-tight mb-3 tracking-tight" style={{ color: '#111827' }}>
          One sentence.
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            A deployed AI agent.
          </span>
        </h1>

        <p className="text-[15px] mb-8" style={{ color: '#9CA3AF' }}>
          Six AI agents do the rest.
        </p>

        {/* Input */}
        <div className="relative mb-5">
          <input
            value={mission}
            onChange={e => setMission(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Describe an AI agent in one sentence..."
            autoFocus
            className="w-full h-14 pl-5 pr-36 rounded-2xl text-[15px] outline-none transition-all duration-300"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8EAF0',
              color: '#111827',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 16px rgba(0,0,0,0.06)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#E8EAF0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!mission.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none',
              boxShadow: mission.trim() ? '0 4px 16px rgba(245,158,11,0.25)' : 'none',
            }}
          >
            Build It →
          </button>
        </div>

        {/* Seeder prompt cards */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12 max-w-[680px] mx-auto">
          {SEEDER_PROMPTS.map(seed => (
            <button
              key={seed.label}
              onClick={() => setMission(seed.prompt)}
              className="flex-1 text-left px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8EAF0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.borderColor = '#D1D5DB';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.borderColor = '#E8EAF0';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>{seed.label}</div>
              <div className="text-[11px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                {seed.prompt.substring(0, 60)}...
              </div>
            </button>
          ))}
        </div>

        {/* Agent dots footer */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] tracking-wide" style={{ color: '#9CA3AF' }}>Zero to Agent · Vercel × DeepMind Hackathon</span>
          <div className="flex gap-1">
            {['#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'].map(c => (
              <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c, opacity: 0.8 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
