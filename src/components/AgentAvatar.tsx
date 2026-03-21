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
            background: '#FFFFFF',
            backdropFilter: 'blur(12px)',
            border: `1px solid #E8EAF0`,
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#374151',
            maxWidth: 200,
            whiteSpace: 'normal' as const,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
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
              borderTop: '5px solid #E8EAF0',
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
                ? 'conic-gradient(#D1D5DB, transparent 70%, #D1D5DB)'
                : '#E8EAF0',
          boxShadow: isActive
            ? `0 0 24px ${agent.color}25`
            : isSelected
              ? '0 0 15px rgba(0,0,0,0.08)'
              : '0 2px 8px rgba(0,0,0,0.08)',
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
            : status === 'waiting' ? '#D1D5DB'
            : status === 'error' ? '#ef4444'
            : '#E8EAF0',
          border: '2.5px solid #F8F9FB',
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
          color: isActive ? '#111827' : isDone ? '#111827' : '#6B7280',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          transition: 'color 0.3s ease',
          textShadow: 'none',
        }}
      >
        {agent.name}
      </div>
      <div
        style={{
          fontSize: 9,
          color: isActive ? agent.color : isDone ? '#10b981' : status === 'waiting' ? '#f59e0b' : '#9CA3AF',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontWeight: 500,
          letterSpacing: '0.05em',
          transition: 'color 0.3s ease',
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {status === 'working' ? funStatusWorking(agent.id)
          : isDone ? funStatusDone(agent.id)
          : status === 'waiting' ? 'In queue...'
          : agent.role}
      </div>
    </div>
  );
}

function funStatusWorking(agentId: string): string {
  const lines: Record<string, string> = {
    ceo: 'Crafting the vision...',
    research: 'Digging into data...',
    product: 'Prioritizing features...',
    architect: 'Drawing blueprints...',
    developer: 'Shipping code...',
  };
  return lines[agentId] || 'Working...';
}

function funStatusDone(agentId: string): string {
  const lines: Record<string, string> = {
    ceo: 'Brief locked in',
    research: 'Intel gathered',
    product: 'PRD shipped',
    architect: 'Blueprints ready',
    developer: 'Code deployed',
  };
  return lines[agentId] || 'Done';
}
