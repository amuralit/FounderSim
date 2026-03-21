'use client';

import { useState } from 'react';
import { Project } from '@/lib/projects';

interface ProjectSwitcherProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelect: (projectId: string) => void;
  onNew: () => void;
  onDelete: (projectId: string) => void;
}

export default function ProjectSwitcher({ projects, currentProjectId, onSelect, onNew, onDelete }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);

  const current = projects.find(p => p.id === currentProjectId);

  const phaseColors: Record<string, string> = {
    idle: '#9CA3AF',
    ceo_conversation: '#f59e0b',
    pipeline: '#10b981',
    delivered: '#3b82f6',
  };

  const phaseLabels: Record<string, string> = {
    idle: 'New',
    ceo_conversation: 'Briefing',
    pipeline: 'Building',
    delivered: 'Complete',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
        style={{ background: '#F3F4F6', border: '1px solid #E8EAF0', color: '#6B7280' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="4" height="4" rx="1" />
          <rect x="7" y="1" width="4" height="4" rx="1" />
          <rect x="1" y="7" width="4" height="4" rx="1" />
          <rect x="7" y="7" width="4" height="4" rx="1" />
        </svg>
        {current ? current.name.substring(0, 24) : 'Projects'}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 3l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full mt-2 right-0 z-50 w-72 rounded-xl overflow-hidden"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8EAF0',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              animation: 'fade-in 0.15s ease',
            }}
          >
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E8EAF0' }}>
              <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>Projects</span>
              <button
                onClick={() => { onNew(); setOpen(false); }}
                className="text-[10px] px-2 py-1 rounded-md cursor-pointer font-semibold"
                style={{ background: '#FEF3C7', color: '#92400E', border: 'none' }}
              >
                + New
              </button>
            </div>
            <div className="max-h-[300px] overflow-auto">
              {projects.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs" style={{ color: '#9CA3AF' }}>
                  No projects yet
                </div>
              ) : (
                projects.sort((a, b) => b.updatedAt - a.updatedAt).map(project => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                    style={{
                      background: project.id === currentProjectId ? '#F8F9FB' : 'transparent',
                      borderBottom: '1px solid #F3F4F6',
                    }}
                    onClick={() => { onSelect(project.id); setOpen(false); }}
                    onMouseEnter={e => { if (project.id !== currentProjectId) (e.currentTarget as HTMLElement).style.background = '#F8F9FB'; }}
                    onMouseLeave={e => { if (project.id !== currentProjectId) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: phaseColors[project.phase] || '#9CA3AF' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: '#111827' }}>
                        {project.name}
                      </div>
                      <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
                        {phaseLabels[project.phase] || project.phase} · {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${project.name}"? This will also remove the deployed app.`)) {
                          onDelete(project.id);
                        }
                      }}
                      className="text-[10px] px-2 py-1 rounded cursor-pointer transition-all shrink-0"
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                      title="Delete project"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
