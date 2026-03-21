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
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 overflow-hidden"
      style={{
        maxWidth: '640px',
        width: '90%',
        borderRadius: '16px',
        background: '#FFFFFF',
        border: '1px solid #E8EAF0',
        borderLeft: '4px solid #f59e0b',
        boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
        animation: 'fade-in 0.4s ease',
      }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: '#F3F4F6' }}>
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
        />
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Icon + label row */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
            style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
          >
            ⏸
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Decision Required</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: '#FEF3C7', color: '#92400E' }}
          >
            {countdown}s
          </span>
        </div>

        {/* Question text — full wrap, not truncated */}
        <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#374151', marginBottom: '16px' }}>
          {question}
        </div>

        {/* Modify input */}
        {showModifyInput && (
          <div className="mb-4">
            <input
              value={modifyText}
              onChange={e => setModifyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && modifyText.trim() && onModify(modifyText.trim())}
              placeholder="Tell the agent what to change..."
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: '#F8F9FB', border: '1px solid #E8EAF0', color: '#111827' }}
              autoFocus
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="font-semibold text-white cursor-pointer transition-all hover:brightness-110"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              borderRadius: '10px',
              background: '#10b981',
              border: 'none',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => setShowModifyInput(!showModifyInput)}
            className="cursor-pointer transition-all hover:brightness-95"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              borderRadius: '10px',
              background: '#F3F4F6',
              color: '#374151',
              border: '1px solid #E8EAF0',
            }}
          >
            Modify
          </button>
          <button
            onClick={onReject}
            className="font-semibold cursor-pointer transition-all hover:brightness-95"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              borderRadius: '10px',
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
