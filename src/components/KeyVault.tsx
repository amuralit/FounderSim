'use client';

import { useState } from 'react';

interface KeyVaultProps {
  onSubmit: (keys: { vercelToken?: string; supabaseUrl?: string; supabaseKey?: string }) => void;
  onSkip: () => void;
}

export default function KeyVault({ onSubmit, onSkip }: KeyVaultProps) {
  const [vercelToken, setVercelToken] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: 'rgba(8,8,14,0.95)', backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-[440px] w-full rounded-xl p-6" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <h2 className="text-lg font-bold mb-1">Deploy Keys</h2>
        <p className="text-xs mb-4" style={{ color: '#888' }}>AI Agents: ✅ Powered by FounderSim</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#888' }}>Vercel Token</label>
            <input
              value={vercelToken}
              onChange={e => setVercelToken(e.target.value)}
              placeholder="Paste to deploy"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#14141e', border: '1px solid #2a2a3a', color: '#e2e2f0' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#888' }}>Supabase URL (optional)</label>
            <input
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#14141e', border: '1px solid #2a2a3a', color: '#e2e2f0' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#888' }}>Supabase Service Key (optional)</label>
            <input
              value={supabaseKey}
              onChange={e => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGc..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#14141e', border: '1px solid #2a2a3a', color: '#e2e2f0' }}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onSubmit({ vercelToken: vercelToken || undefined, supabaseUrl: supabaseUrl || undefined, supabaseKey: supabaseKey || undefined })}
            className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            Start Building →
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg text-sm cursor-pointer"
            style={{ background: '#1a1a28', border: '1px solid #333', color: '#ccc' }}
          >
            Skip
          </button>
        </div>
        <p className="text-[11px] mt-3 text-center" style={{ color: '#555' }}>
          Skip? Simulation runs, deploy simulated.
        </p>
      </div>
    </div>
  );
}
