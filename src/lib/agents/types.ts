export type AgentId = 'ceo' | 'research' | 'product' | 'architect' | 'developer' | 'tester';
export type AgentStatus = 'idle' | 'waiting' | 'working' | 'done' | 'error';
export type SimPhase = 'idle' | 'ceo_conversation' | 'pipeline' | 'delivered';

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  avatar: string;
  personality: string;
  zone: string;
  defaultPosition: { x: number; y: number };
}

export interface ChatMessage { from: 'user' | AgentId; text: string; ts: number; }
export interface DecisionEntry { ts: number; agent: AgentId; type: string; desc: string; }

export interface SSEEvent {
  type: 'agent_start' | 'agent_speech' | 'agent_output' | 'agent_done' |
        'approval_gate' | 'image_ready' | 'deploy_status' | 'phase_change' | 'error';
  data: Record<string, unknown>;
}
