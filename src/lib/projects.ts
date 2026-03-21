import { AgentId, AgentStatus, SimPhase, ChatMessage, DecisionEntry } from './agents/types';

export interface Project {
  id: string;
  name: string;
  mission: string;
  createdAt: number;
  updatedAt: number;
  phase: SimPhase;
  companyBrief: string;
  pendingBrief: string | null;
  outputs: Record<string, string>;
  chatHistories: Record<string, ChatMessage[]>;
  decisions: DecisionEntry[];
  statuses: Record<AgentId, AgentStatus>;
  demoUrl: string | null;
  webUrl: string | null;
  logoBase64: string | null;
  competitiveVisualBase64: string | null;
}

const STORAGE_KEY = 'foundersim-projects';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch { /* quota exceeded */ }
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: Date.now() };
  } else {
    projects.push(project);
  }
  saveProjects(projects);
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjects(projects);
}

export function createNewProject(): Project {
  return {
    id: generateId(),
    name: 'New Project',
    mission: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: 'idle',
    companyBrief: '',
    pendingBrief: null,
    outputs: {},
    chatHistories: {},
    decisions: [],
    statuses: { ceo: 'idle', research: 'idle', product: 'idle', architect: 'idle', developer: 'idle', tester: 'idle' },
    demoUrl: null,
    webUrl: null,
    logoBase64: null,
    competitiveVisualBase64: null,
  };
}

// Migrate old single-project localStorage to new format
export function migrateOldState(): Project | null {
  try {
    const old = localStorage.getItem('foundersim-state');
    if (!old) return null;
    const s = JSON.parse(old);
    if (!s.phase || s.phase === 'idle') return null;
    const project: Project = {
      id: generateId(),
      name: s.mission?.substring(0, 40) || 'Imported Project',
      mission: s.mission || '',
      createdAt: Date.now() - 60000,
      updatedAt: Date.now(),
      phase: s.phase,
      companyBrief: s.companyBrief || '',
      pendingBrief: s.pendingBrief || null,
      outputs: s.outputs || {},
      chatHistories: s.chatHistories || {},
      decisions: s.decisions || [],
      statuses: s.statuses || { ceo: 'idle', research: 'idle', product: 'idle', architect: 'idle', developer: 'idle', tester: 'idle' },
      demoUrl: s.demoUrl || null,
      webUrl: s.webUrl || null,
      logoBase64: s.logoBase64 || null,
      competitiveVisualBase64: s.competitiveVisualBase64 || null,
    };
    // Remove old key
    localStorage.removeItem('foundersim-state');
    return project;
  } catch { return null; }
}
