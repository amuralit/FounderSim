'use client';

import { useState, useMemo, useCallback, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentId } from '@/lib/agents/types';
import { AGENTS } from '@/lib/agents/config';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ArtifactPanelProps {
  outputs: Record<string, string>;  // agentId -> output text
  companyBrief: string;
  demoUrl: string | null;
  webUrl: string | null;
  logoBase64: string | null;
  onClose: () => void;
}

interface ArtifactEntry {
  id: string;
  filename: string;
  icon: string;
  agentId: AgentId;
  agentName: string;
  agentColor: string;
  content: string | null;
  mimeType: string;
  isBinary: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadFile(filename: string, content: string, mimeType: string = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBase64File(filename: string, base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getAgentDef(agentId: AgentId) {
  return AGENTS.find(a => a.id === agentId)!;
}

/* ------------------------------------------------------------------ */
/*  Markdown components (neutral / file-preview style)                 */
/* ------------------------------------------------------------------ */

function buildPreviewMarkdownComponents() {
  const accent = '#a78bfa';
  return {
    h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
      <h1 className="text-lg font-bold mt-4 mb-2 pb-1.5" style={{ color: '#e2e2f0', borderBottom: '1px solid #1e1e2e' }} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
      <h2 className="text-base font-bold mt-3.5 mb-1.5" style={{ color: '#e2e2f0' }} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
      <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: '#ccc' }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
      <p className="mb-2.5 text-[13px] leading-[1.75] text-[#bbb]" {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
      <ul className="mb-2.5 ml-4 space-y-1 list-disc marker:text-[#555]" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
      <ol className="mb-2.5 ml-4 space-y-1 list-decimal marker:text-[#555]" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
      <li className="text-[13px] text-[#bbb] leading-[1.7] pl-0.5" {...props}>{children}</li>
    ),
    a: ({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: accent }} {...props}>{children}</a>
    ),
    strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
      <strong className="font-semibold text-[#e2e2f0]" {...props}>{children}</strong>
    ),
    blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote className="my-2.5 pl-3 py-1 text-[12px] italic text-[#888] rounded-r-md" style={{ borderLeft: '3px solid #333', background: '#ffffff06' }} {...props}>{children}</blockquote>
    ),
    hr: (props: ComponentPropsWithoutRef<'hr'>) => (
      <hr className="my-3 border-0 h-px bg-[#1e1e2e]" {...props} />
    ),
    code: ({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) => {
      const isBlock = typeof className === 'string' && className.startsWith('language-');
      if (isBlock) {
        const lang = className?.replace('language-', '') ?? '';
        return (
          <div className="my-2.5 rounded-lg overflow-hidden" style={{ border: '1px solid #1e1e2e' }}>
            {lang && (
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ background: '#ffffff08', color: '#666', borderBottom: '1px solid #1e1e2e' }}>
                {lang}
              </div>
            )}
            <pre className="p-3 overflow-x-auto text-[12px] leading-[1.7] m-0" style={{ background: '#08080e' }}>
              <code className="font-mono text-[#c8c8d8]" {...props}>{children}</code>
            </pre>
          </div>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded text-[12px] font-mono" style={{ background: '#ffffff0a', color: '#c8c8d8', border: '1px solid #1e1e2e' }} {...props}>{children}</code>
      );
    },
    pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
    table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
      <div className="my-2.5 overflow-x-auto rounded-lg" style={{ border: '1px solid #1e1e2e' }}>
        <table className="w-full text-[12px] border-collapse" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
      <thead style={{ background: '#ffffff08' }} {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
      <th className="text-left px-3 py-2 font-semibold text-[11px] uppercase tracking-wider text-[#999]" style={{ borderBottom: '1px solid #1e1e2e' }} {...props}>{children}</th>
    ),
    tr: ({ children, ...props }: ComponentPropsWithoutRef<'tr'>) => (
      <tr className="even:bg-[#ffffff04] hover:bg-[#ffffff06]" style={{ borderBottom: '1px solid #141420' }} {...props}>{children}</tr>
    ),
    td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
      <td className="px-3 py-2 text-[#bbb]" {...props}>{children}</td>
    ),
  };
}

/* ------------------------------------------------------------------ */
/*  File row component                                                 */
/* ------------------------------------------------------------------ */

function FileRow({
  artifact,
  isExpanded,
  onToggle,
  mdComponents,
}: {
  artifact: ArtifactEntry;
  isExpanded: boolean;
  onToggle: () => void;
  mdComponents: ReturnType<typeof buildPreviewMarkdownComponents>;
}) {
  const isReady = artifact.content !== null;
  const fileSize = artifact.content
    ? formatFileSize(
        artifact.isBinary
          ? Math.ceil((artifact.content.length * 3) / 4) // base64 → byte estimate
          : new TextEncoder().encode(artifact.content).byteLength
      )
    : '--';

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!artifact.content) return;
    if (artifact.isBinary) {
      downloadBase64File(artifact.filename, artifact.content, artifact.mimeType);
    } else {
      downloadFile(artifact.filename, artifact.content, artifact.mimeType);
    }
  }, [artifact]);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-200"
      style={{
        background: isExpanded ? '#10101a' : '#0c0c14',
        border: `1px solid ${isExpanded ? '#2a2a3a' : '#1e1e2e'}`,
      }}
    >
      {/* Row header (always visible) */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 select-none"
        style={{ background: isExpanded ? '#12121a' : undefined }}
        onClick={onToggle}
      >
        {/* Expand chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            color: '#555',
          }}
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Icon + filename */}
        <span className="text-base shrink-0">{artifact.icon}</span>
        <span className="text-[13px] font-medium text-[#e2e2f0] truncate flex-1">
          {artifact.filename}
        </span>

        {/* Agent badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: artifact.agentColor }}
          />
          <span className="text-[11px] text-[#666] hidden sm:inline">
            {artifact.agentName.split(' ')[0]}
          </span>
        </div>

        {/* File size */}
        <span className="text-[11px] font-mono text-[#555] w-16 text-right shrink-0">
          {fileSize}
        </span>

        {/* Status badge */}
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
          style={
            isReady
              ? { background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }
              : { background: '#ffffff08', color: '#555', border: '1px solid #ffffff10' }
          }
        >
          {isReady ? 'Ready' : 'Pending'}
        </span>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!isReady}
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer disabled:opacity-20 disabled:cursor-default hover:bg-[#1a1a28]"
          style={{ background: 'transparent', border: 'none', color: '#888' }}
          aria-label={`Download ${artifact.filename}`}
          title="Download"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v9M3.5 7L7 10.5 10.5 7" />
            <path d="M1.5 12h11" />
          </svg>
        </button>
      </div>

      {/* Expanded preview */}
      {isExpanded && isReady && artifact.content && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: '1px solid #1e1e2e' }}
        >
          {artifact.isBinary ? (
            /* Logo image preview */
            <div className="pt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${artifact.mimeType};base64,${artifact.content}`}
                alt={artifact.filename}
                className="max-w-[200px] max-h-[200px] rounded-lg"
                style={{ border: '1px solid #1e1e2e' }}
              />
            </div>
          ) : (
            /* Markdown preview */
            <div
              className="pt-4 max-h-[400px] overflow-y-auto pr-2"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {artifact.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded but pending */}
      {isExpanded && !isReady && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid #1e1e2e' }}>
          <div className="pt-4 flex flex-col items-center py-8 text-center">
            <div
              className="w-10 h-10 rounded-full mb-3 flex items-center justify-center"
              style={{ background: '#ffffff06', border: '1px solid #1e1e2e' }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  border: '2px solid #333',
                  borderTopColor: artifact.agentColor,
                  animation: 'artifact-spin 0.8s linear infinite',
                }}
              />
            </div>
            <span className="text-[12px] text-[#555]">
              Waiting for {artifact.agentName.split(' ')[0]} to finish...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ArtifactPanel({
  outputs,
  companyBrief,
  demoUrl,
  webUrl,
  logoBase64,
  onClose,
}: ArtifactPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mdComponents = useMemo(() => buildPreviewMarkdownComponents(), []);

  /* Build artifact list */
  const artifacts = useMemo<ArtifactEntry[]>(() => {
    const ceo = getAgentDef('ceo');
    const research = getAgentDef('research');
    const product = getAgentDef('product');
    const architect = getAgentDef('architect');
    const developer = getAgentDef('developer');

    const entries: ArtifactEntry[] = [
      {
        id: 'brief',
        filename: 'company-brief.md',
        icon: '\u{1F4C4}',
        agentId: 'ceo',
        agentName: ceo.name,
        agentColor: ceo.color,
        content: companyBrief || null,
        mimeType: 'text/markdown',
        isBinary: false,
      },
      {
        id: 'research',
        filename: 'competitive-analysis.md',
        icon: '\u{1F4CA}',
        agentId: 'research',
        agentName: research.name,
        agentColor: research.color,
        content: outputs['research'] || null,
        mimeType: 'text/markdown',
        isBinary: false,
      },
      {
        id: 'product',
        filename: 'product-requirements.md',
        icon: '\u{1F4CB}',
        agentId: 'product',
        agentName: product.name,
        agentColor: product.color,
        content: outputs['product'] || null,
        mimeType: 'text/markdown',
        isBinary: false,
      },
      {
        id: 'architect',
        filename: 'architecture.md',
        icon: '\u{1F3D7}',
        agentId: 'architect',
        agentName: architect.name,
        agentColor: architect.color,
        content: outputs['architect'] || null,
        mimeType: 'text/markdown',
        isBinary: false,
      },
      {
        id: 'developer',
        filename: 'generated-code.md',
        icon: '\u{1F4BB}',
        agentId: 'developer',
        agentName: developer.name,
        agentColor: developer.color,
        content: outputs['developer'] || null,
        mimeType: 'text/markdown',
        isBinary: false,
      },
    ];

    if (logoBase64) {
      entries.push({
        id: 'logo',
        filename: 'logo.png',
        icon: '\u{1F3A8}',
        agentId: 'ceo',
        agentName: ceo.name,
        agentColor: ceo.color,
        content: logoBase64,
        mimeType: 'image/png',
        isBinary: true,
      });
    }

    return entries;
  }, [outputs, companyBrief, logoBase64]);

  /* Stats */
  const readyCount = artifacts.filter(a => a.content !== null).length;
  const totalCount = artifacts.length;
  const totalBytes = artifacts.reduce((sum, a) => {
    if (!a.content) return sum;
    if (a.isBinary) return sum + Math.ceil((a.content.length * 3) / 4);
    return sum + new TextEncoder().encode(a.content).byteLength;
  }, 0);

  /* Download all */
  const handleDownloadAll = useCallback(() => {
    for (const artifact of artifacts) {
      if (!artifact.content) continue;
      if (artifact.isBinary) {
        downloadBase64File(artifact.filename, artifact.content, artifact.mimeType);
      } else {
        downloadFile(artifact.filename, artifact.content, artifact.mimeType);
      }
    }
  }, [artifacts]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full flex flex-col"
        style={{
          width: 'min(520px, 90vw)',
          background: '#0c0c14',
          borderLeft: '1px solid #1e1e2e',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          animation: 'artifact-slide-in 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #1e1e2e' }}
        >
          <div className="flex items-center gap-3">
            {/* Folder icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#ffffff08', border: '1px solid #1e1e2e' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 5.5C2 4.4 2.9 3.5 4 3.5h3l2 2h5c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-7z"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#f59e0b18"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#e2e2f0]">Artifacts</h2>
              <p className="text-[11px] text-[#555]">
                {readyCount}/{totalCount} files &middot; {formatFileSize(totalBytes)}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 cursor-pointer hover:bg-[#1a1a28]"
            style={{ background: 'transparent', border: 'none', color: '#666' }}
            aria-label="Close artifacts panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Links bar (if demoUrl or webUrl) */}
        {(demoUrl || webUrl) && (
          <div
            className="flex items-center gap-3 px-5 py-3 shrink-0"
            style={{ borderBottom: '1px solid #1e1e2e', background: '#0a0a12' }}
          >
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity duration-150 hover:opacity-80"
                style={{ color: '#10b981' }}
              >
                <span className="block w-2 h-2 rounded-full bg-[#10b981]" />
                Live Demo
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 1h6v6M9 1L1 9" />
                </svg>
              </a>
            )}
            {webUrl && (
              <a
                href={webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity duration-150 hover:opacity-80"
                style={{ color: '#8b5cf6' }}
              >
                <span className="block w-2 h-2 rounded-full bg-[#8b5cf6]" />
                v0 Project
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 1h6v6M9 1L1 9" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#555]">
              Pipeline Progress
            </span>
            <span className="text-[11px] font-mono text-[#555]">
              {readyCount}/{totalCount}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: '#1e1e2e' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: totalCount > 0 ? `${(readyCount / totalCount) * 100}%` : '0%',
                background: readyCount === totalCount
                  ? 'linear-gradient(90deg, #22c55e, #10b981)'
                  : 'linear-gradient(90deg, #f59e0b, #ef4444)',
              }}
            />
          </div>
        </div>

        {/* File list */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          {artifacts.map((artifact) => (
            <FileRow
              key={artifact.id}
              artifact={artifact}
              isExpanded={expandedId === artifact.id}
              onToggle={() => toggleExpand(artifact.id)}
              mdComponents={mdComponents}
            />
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid #1e1e2e', background: '#0a0a12' }}
        >
          <span className="text-[11px] text-[#444]">
            {readyCount === totalCount && readyCount > 0
              ? 'All artifacts ready'
              : `${totalCount - readyCount} artifact${totalCount - readyCount !== 1 ? 's' : ''} pending`}
          </span>
          <button
            onClick={handleDownloadAll}
            disabled={readyCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-default"
            style={{
              background: readyCount > 0 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : '#1a1a28',
              color: readyCount > 0 ? '#fff' : '#555',
              border: 'none',
              boxShadow: readyCount > 0 ? '0 2px 12px rgba(245,158,11,0.25)' : 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1v9M3.5 7L7 10.5 10.5 7" />
              <path d="M1.5 12h11" />
            </svg>
            Download All
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes artifact-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes artifact-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
