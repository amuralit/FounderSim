'use client';

import { AgentDef, AgentId, AgentStatus } from '@/lib/agents/types';
import { AGENTS, ZONES } from '@/lib/agents/config';
import AgentAvatar from './AgentAvatar';

interface OfficeViewProps {
  agents: AgentDef[];
  statuses: Record<AgentId, AgentStatus>;
  positions: Record<AgentId, { x: number; y: number }>;
  speeches: Record<string, string | null>;
  selectedAgentId: AgentId | null;
  onAgentClick: (agentId: AgentId) => void;
}

const ZONE_META: Record<string, { emoji: string; agentColor: string }> = {
  'ceo-office':   { emoji: '👑', agentColor: '#f59e0b' },
  'research-lab': { emoji: '🔬', agentColor: '#3b82f6' },
  'war-room':     { emoji: '🎯', agentColor: '#8b5cf6' },
  'architecture': { emoji: '🏗', agentColor: '#06b6d4' },
  'dev-bay':      { emoji: '💻', agentColor: '#10b981' },
  'deploy-zone':  { emoji: '🚀', agentColor: '#f59e0b' },
  'debate-arena': { emoji: '⚡', agentColor: '#ef4444' },
};

function isAgentInZoneWorking(zoneId: string, statuses: Record<AgentId, AgentStatus>): boolean {
  const agent = AGENTS.find(a => a.zone === zoneId);
  return agent ? statuses[agent.id] === 'working' : false;
}

function isAgentInZoneDone(zoneId: string, statuses: Record<AgentId, AgentStatus>): boolean {
  const agent = AGENTS.find(a => a.zone === zoneId);
  return agent ? statuses[agent.id] === 'done' : false;
}

export default function OfficeView({ agents, statuses, positions, speeches, selectedAgentId, onAgentClick }: OfficeViewProps) {
  return (
    <div className="office-root">

      {/* Zone cards */}
      {ZONES.map(zone => {
        const meta = ZONE_META[zone.id] || { emoji: '', agentColor: '#888' };
        const isActive = isAgentInZoneWorking(zone.id, statuses);
        const isDone = isAgentInZoneDone(zone.id, statuses);

        return (
          <div
            key={zone.id}
            className={`office-zone ${isActive ? 'office-zone--active' : ''} ${isDone ? 'office-zone--done' : ''}`}
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
              '--zone-color': meta.agentColor,
              '--zone-color-alpha': `${meta.agentColor}08`,
              '--zone-color-dim': `${meta.agentColor}25`,
              '--zone-color-ultra-dim': `${meta.agentColor}06`,
              '--zone-color-mid': `${meta.agentColor}80`,
            } as React.CSSProperties}
          >
            <div className="office-zone-inner" />
            <div className="office-zone-glow" />
            <div className="corner-accent corner-accent--tl" />
            <div className="corner-accent corner-accent--tr" />
            <div className="corner-accent corner-accent--bl" />
            <div className="corner-accent corner-accent--br" />
            <span className="office-zone-label">
              <span style={{ fontSize: 11 }}>{meta.emoji}</span>
              {zone.label}
            </span>
          </div>
        );
      })}

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1] office-connections">
        <defs>
          {agents.filter(a => a.id !== 'ceo').map(agent => (
            <linearGradient
              key={`grad-${agent.id}`}
              id={`line-grad-${agent.id}`}
              x1="0%" y1="0%" x2="100%" y2="0%"
            >
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
              <stop offset="100%" stopColor={agent.color} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>
        {agents.map(agent => {
          if (agent.id === 'ceo') return null;
          const from = positions['ceo'];
          const to = positions[agent.id];
          const status = statuses[agent.id];
          if (status === 'idle' || status === 'waiting') return null;
          return (
            <line
              key={agent.id}
              x1={`${from.x}%`}
              y1={`${from.y + 5}%`}
              x2={`${to.x}%`}
              y2={`${to.y + 5}%`}
              stroke={`url(#line-grad-${agent.id})`}
              strokeWidth={1}
              strokeDasharray="4 8"
              strokeLinecap="round"
              opacity={status === 'working' ? 0.6 : 0.2}
            />
          );
        })}
      </svg>

      {/* Agent avatars */}
      {agents.map(agent => (
        <AgentAvatar
          key={agent.id}
          agent={agent}
          status={statuses[agent.id]}
          position={positions[agent.id]}
          speech={speeches[agent.id] || null}
          isSelected={selectedAgentId === agent.id}
          onClick={() => onAgentClick(agent.id)}
        />
      ))}
    </div>
  );
}
