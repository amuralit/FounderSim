'use client';

import { useState, useEffect, useRef } from 'react';

interface ApprovalGateProps {
  question: string;
  details?: string;
  autoApproveMs?: number;
  onApprove: () => void;
  onModify: (feedback: string) => void;
  onReject: () => void;
}

export default function ApprovalGate({ question, details, autoApproveMs = 10000, onApprove, onModify, onReject }: ApprovalGateProps) {
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyText, setModifyText] = useState('');
  const [countdown, setCountdown] = useState(Math.ceil(autoApproveMs / 1000));
  const approveRef = useRef(onApprove);
  approveRef.current = onApprove;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use setTimeout to avoid setState-during-render
          setTimeout(() => approveRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoApproveMs]);

  const progress = ((autoApproveMs / 1000 - countdown) / (autoApproveMs / 1000)) * 100;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-2xl overflow-hidden max-w-[520px] w-[90%]"
      style={{
        background: 'linear-gradient(135deg, #1a1a28, #1e1528)',
        border: '1px solid #f59e0b30',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 60px rgba(245,158,11,0.08)',
        animation: 'fade-in 0.4s ease',
      }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: '#2a2a3a' }}>
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
        />
      </div>

      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
            style={{ background: '#f59e0b15', border: '1px solid #f59e0b30' }}>
            ⏸
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Decision Required</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#f59e0b15', color: '#f59e0b99' }}>
                {countdown}s
              </span>
            </div>
            <div className="text-[13px] leading-relaxed" style={{ color: '#ccc' }}>{question}</div>
          </div>
        </div>

        {showModifyInput && (
          <div className="mt-3 ml-12">
            <input
              value={modifyText}
              onChange={e => setModifyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && modifyText.trim() && onModify(modifyText.trim())}
              placeholder="Tell the agent what to change..."
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: '#14141e', border: '1px solid #2a2a3a', color: '#e2e2f0' }}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-2 mt-3 ml-12">
          <button
            onClick={onApprove}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            Approve
          </button>
          <button
            onClick={() => setShowModifyInput(!showModifyInput)}
            className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:brightness-110"
            style={{ background: '#ffffff08', border: '1px solid #ffffff15', color: '#aaa' }}
          >
            Modify
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:brightness-110"
            style={{ background: '#ef444420', border: '1px solid #ef444430', color: '#ef4444' }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
