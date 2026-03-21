'use client';

import { useState } from 'react';

interface MissionInputProps {
  onSubmit: (mission: string) => void;
}

const EXAMPLES = [
  'A tool that helps freelancers get paid faster',
  'AI-powered competitive intelligence for sales teams',
  'A smart booking system for independent consultants',
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
        <h1 className="text-[42px] font-bold leading-tight mb-4 tracking-tight" style={{ color: '#111827' }}>
          What company should
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            we build?
          </span>
        </h1>

        <p className="text-base mb-10 leading-relaxed" style={{ color: '#6B7280' }}>
          Describe your idea in one sentence. Five AI agents will
          <br className="hidden sm:block" />
          research, design, build, and deploy it — while you watch.
        </p>

        {/* Input */}
        <div className="relative mb-5">
          <input
            value={mission}
            onChange={e => setMission(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. A tool that helps freelancers track invoices and get paid faster"
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

        {/* Example pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setMission(ex)}
              className="px-4 py-2 rounded-full text-xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: '#F3F4F6',
                border: '1px solid #E8EAF0',
                color: '#6B7280',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.borderColor = '#D1D5DB';
                (e.target as HTMLElement).style.color = '#374151';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.borderColor = '#E8EAF0';
                (e.target as HTMLElement).style.color = '#6B7280';
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Agent dots footer */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] tracking-wide" style={{ color: '#9CA3AF' }}>Powered by 5 AI Agents</span>
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
