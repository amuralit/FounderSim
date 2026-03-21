import { AgentDef } from './types';

export const AGENTS: AgentDef[] = [
  { id: 'ceo', name: 'Nova', role: 'Strategist', color: '#f59e0b',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Nova&backgroundColor=f59e0b',
    personality: 'First-principles thinker. Two exits, zero buzzwords.', zone: 'ceo-office',
    defaultPosition: { x: 50, y: 24 } },
  { id: 'research', name: 'Scout', role: 'Analyst', color: '#3b82f6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Scout&backgroundColor=3b82f6',
    personality: 'Every claim has a source. Every source has a URL.', zone: 'research-lab',
    defaultPosition: { x: 17, y: 24 } },
  { id: 'product', name: 'Sage', role: 'Product', color: '#8b5cf6',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Sage&backgroundColor=8b5cf6',
    personality: 'User-obsessed. Says no to 90% of features.', zone: 'war-room',
    defaultPosition: { x: 83, y: 24 } },
  { id: 'architect', name: 'Atlas', role: 'Architect', color: '#06b6d4',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Atlas&backgroundColor=06b6d4',
    personality: 'Boring tech wins. Documents every tradeoff.', zone: 'architecture',
    defaultPosition: { x: 50, y: 70 } },
  { id: 'developer', name: 'Pixel', role: 'Builder', color: '#10b981',
    avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=Pixel&backgroundColor=10b981',
    personality: 'Ships fast. No TODOs, no placeholders, no excuses.', zone: 'dev-bay',
    defaultPosition: { x: 83, y: 70 } },
];

// Clean 2x3 grid — zones centered with gutters, no clipping
export const ZONES = [
  { id: 'research-lab', label: 'Research',      x: 1.5,  y: 2,   w: 31, h: 44 },
  { id: 'ceo-office',   label: 'Strategy',      x: 34.5, y: 2,   w: 31, h: 44 },
  { id: 'war-room',     label: 'Product',       x: 67.5, y: 2,   w: 31, h: 44 },
  { id: 'deploy-zone',  label: 'Deploy',        x: 1.5,  y: 50,  w: 31, h: 44 },
  { id: 'architecture', label: 'Architecture',  x: 34.5, y: 50,  w: 31, h: 44 },
  { id: 'dev-bay',      label: 'Development',   x: 67.5, y: 50,  w: 31, h: 44 },
];
