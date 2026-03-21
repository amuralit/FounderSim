import { AgentDef } from './types';

export const AGENTS: AgentDef[] = [
  { id: 'ceo', name: 'Ada Chen', role: 'CEO', color: '#f59e0b',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Ada&backgroundColor=f59e0b',
    personality: 'First-principles thinker. Cuts ambiguity.', zone: 'ceo-office',
    defaultPosition: { x: 50, y: 28 } },
  { id: 'research', name: 'Dr. Kai Patel', role: 'Research', color: '#3b82f6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Kai&backgroundColor=3b82f6',
    personality: 'Data-driven. Every claim has a source.', zone: 'research-lab',
    defaultPosition: { x: 15, y: 18 } },
  { id: 'product', name: 'Maya Rodriguez', role: 'Product', color: '#8b5cf6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Maya&backgroundColor=8b5cf6',
    personality: 'User-obsessed. Kills features with conviction.', zone: 'war-room',
    defaultPosition: { x: 72, y: 18 } },
  { id: 'architect', name: 'James Okonkwo', role: 'Architect', color: '#06b6d4',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=James&backgroundColor=06b6d4',
    personality: 'Boring is beautiful. Documents every tradeoff.', zone: 'architecture',
    defaultPosition: { x: 50, y: 72 } },
  { id: 'developer', name: 'Priya Sharma', role: 'Developer', color: '#10b981',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Priya&backgroundColor=10b981',
    personality: 'Ships clean code. Allergic to over-engineering.', zone: 'dev-bay',
    defaultPosition: { x: 82, y: 72 } },
];

export const ZONES = [
  { id: 'ceo-office', label: 'CEO Office', x: 35, y: 18, w: 30, h: 22 },
  { id: 'research-lab', label: 'Research Lab', x: 2, y: 5, w: 30, h: 28 },
  { id: 'war-room', label: 'War Room', x: 68, y: 5, w: 30, h: 28 },
  { id: 'architecture', label: 'Architecture', x: 35, y: 60, w: 30, h: 22 },
  { id: 'dev-bay', label: 'Dev Bay', x: 68, y: 60, w: 30, h: 22 },
  { id: 'deploy-zone', label: 'Deploy', x: 2, y: 60, w: 30, h: 22 },
  { id: 'debate-arena', label: 'Debate Arena', x: 35, y: 38, w: 30, h: 20 },
];
