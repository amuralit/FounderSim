import { AgentDef } from './types';

export const AGENTS: AgentDef[] = [
  { id: 'ceo', name: 'Nova', role: 'Strategist', color: '#f59e0b',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Nova&backgroundColor=f59e0b',
    personality: 'First-principles thinker. Two exits, zero buzzwords.', zone: 'ceo-office',
    defaultPosition: { x: 50, y: 28 } },
  { id: 'research', name: 'Scout', role: 'Analyst', color: '#3b82f6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Scout&backgroundColor=3b82f6',
    personality: 'Every claim has a source. Every source has a URL.', zone: 'research-lab',
    defaultPosition: { x: 15, y: 18 } },
  { id: 'product', name: 'Sage', role: 'Product', color: '#8b5cf6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Sage&backgroundColor=8b5cf6',
    personality: 'User-obsessed. Says no to 90% of features.', zone: 'war-room',
    defaultPosition: { x: 72, y: 18 } },
  { id: 'architect', name: 'Atlas', role: 'Architect', color: '#06b6d4',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Atlas&backgroundColor=06b6d4',
    personality: 'Boring tech wins. Documents every tradeoff.', zone: 'architecture',
    defaultPosition: { x: 50, y: 72 } },
  { id: 'developer', name: 'Pixel', role: 'Builder', color: '#10b981',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Pixel&backgroundColor=10b981',
    personality: 'Ships fast. No TODOs, no placeholders, no excuses.', zone: 'dev-bay',
    defaultPosition: { x: 82, y: 72 } },
];

export const ZONES = [
  { id: 'ceo-office', label: 'Strategy', x: 35, y: 18, w: 30, h: 22 },
  { id: 'research-lab', label: 'Research', x: 2, y: 5, w: 30, h: 28 },
  { id: 'war-room', label: 'Product', x: 68, y: 5, w: 30, h: 28 },
  { id: 'architecture', label: 'Architecture', x: 35, y: 60, w: 30, h: 22 },
  { id: 'dev-bay', label: 'Development', x: 68, y: 60, w: 30, h: 22 },
  { id: 'deploy-zone', label: 'Deploy', x: 2, y: 60, w: 30, h: 22 },
  { id: 'debate-arena', label: 'Collab', x: 35, y: 38, w: 30, h: 20 },
];
