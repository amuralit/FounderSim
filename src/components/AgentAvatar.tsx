'use client';

import { AgentDef, AgentStatus } from '@/lib/agents/types';

interface AgentAvatarProps {
  agent: AgentDef;
  status: AgentStatus;
  position: { x: number; y: number };
  speech: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export default function AgentAvatar({ agent, status, position, speech, isSelected, onClick }: AgentAvatarProps) {
  const isActive = status === 'working';
  const isDone = status === 'done';

  return (
    <div
      className="agent-avatar-wrap"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        zIndex: isActive ? 10 : isSelected ? 9 : 5,
      }}
      onClick={onClick}
    >
      {/* Speech bubble */}
      {speech && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(18,18,26,0.95)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${agent.color}30`,
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#ccc',
            maxWidth: 200,
            whiteSpace: 'normal' as const,
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 20px ${agent.color}08`,
            animation: 'bubbleIn 0.3s ease',
            zIndex: 20,
          }}
        >
          {speech}
          <div
            style={{
              position: 'absolute',
              bottom: -5,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${agent.color}30`,
            }}
          />
        </div>
      )}

      {/* Avatar ring */}
      <div
        className="agent-ring"
        style={{
          background: isActive
            ? `conic-gradient(${agent.color}, transparent 30%, ${agent.color})`
            : isDone
              ? `conic-gradient(#10b981, transparent 70%, #10b981)`
              : isSelected
                ? 'conic-gradient(#fff4, transparent 70%, #fff4)'
                : '#222',
          boxShadow: isActive
            ? `0 0 24px ${agent.color}35, 0 0 48px ${agent.color}15`
            : isSelected
              ? '0 0 20px rgba(255,255,255,0.08)'
              : '0 2px 8px rgba(0,0,0,0.3)',
          animation: isActive ? 'orbit 3s linear infinite' : 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={agent.avatar} alt={agent.name} className="agent-img" />
      </div>

      {/* Status dot */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          right: -2,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background:
            status === 'done' ? '#10b981'
            : status === 'working' ? agent.color
            : status === 'waiting' ? '#444'
            : status === 'error' ? '#ef4444'
            : '#2a2a2a',
          border: '2.5px solid #07070d',
          boxShadow: status === 'working' ? `0 0 6px ${agent.color}60` : 'none',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Name */}
      <div
        className="agent-name"
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 600,
          color: isActive ? '#fff' : isDone ? '#aaa' : '#666',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          transition: 'color 0.3s ease',
          textShadow: isActive ? `0 0 8px ${agent.color}40` : 'none',
        }}
      >
        {agent.name}
      </div>
      <div
        style={{
          fontSize: 9,
          color: isActive ? agent.color : '#444',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontWeight: 500,
          letterSpacing: '0.05em',
          transition: 'color 0.3s ease',
        }}
      >
        {agent.role}
      </div>
    </div>
  );
}
