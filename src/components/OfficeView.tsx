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
  'ceo-office':   { emoji: '\u{1F451}', agentColor: '#f59e0b' },
  'research-lab': { emoji: '\u{1F52C}', agentColor: '#3b82f6' },
  'war-room':     { emoji: '\u{1F3AF}', agentColor: '#8b5cf6' },
  'architecture': { emoji: '\u{1F3D7}', agentColor: '#06b6d4' },
  'dev-bay':      { emoji: '\u{1F4BB}', agentColor: '#10b981' },
  'deploy-zone':  { emoji: '\u{1F680}', agentColor: '#f59e0b' },
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
              '--zone-color-alpha': `${meta.agentColor}10`,
              '--zone-color-dim': `${meta.agentColor}30`,
              '--zone-color-ultra-dim': `${meta.agentColor}06`,
              '--zone-color-mid': `${meta.agentColor}cc`,
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
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {agents.map(agent => {
          if (agent.id === 'ceo') return null;
          const from = positions['ceo'];
          const to = positions[agent.id];
          const status = statuses[agent.id];
          if (status === 'idle' || status === 'waiting') return null;
          const isWorking = status === 'working';
          return (
            <g key={agent.id}>
              <line
                x1={`${from.x}%`}
                y1={`${from.y + 5}%`}
                x2={`${to.x}%`}
                y2={`${to.y + 5}%`}
                stroke={`url(#line-grad-${agent.id})`}
                strokeWidth={isWorking ? 1.5 : 1}
                strokeDasharray="4 8"
                strokeLinecap="round"
                opacity={isWorking ? 0.7 : 0.2}
                filter={isWorking ? 'url(#line-glow)' : undefined}
                style={isWorking ? { animation: 'flowDash 1s linear infinite' } : undefined}
              />
              {isWorking && (
                <>
                  <circle r="3" fill={agent.color} opacity={0.8}>
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M${from.x},${from.y + 5} L${to.x},${to.y + 5}`}
                      keyPoints="0;1"
                      keyTimes="0;1"
                    />
                  </circle>
                  <circle r="3" fill={agent.color} opacity={0.4}>
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M${from.x},${from.y + 5} L${to.x},${to.y + 5}`}
                      keyPoints="0;1"
                      keyTimes="0;1"
                      begin="0.7s"
                    />
                  </circle>
                </>
              )}
            </g>
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
