'use client';

import { useState, useMemo, useCallback, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
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
  marketMapBase64?: string | null;
  archDiagramBase64?: string | null;
  productMockupBase64?: string | null;
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
  associatedImage?: string | null;  // base64 image to embed in PDF
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadAsPDF(filename: string, content: string, title: string, imageBase64?: string | null) {
  // Use landscape if content has wide tables (7+ column tables)
  const hasWideTable = (content.match(/\|/g) || []).length > 50;
  const orientation = hasWideTable ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  let y = 50;

  /* --- Title bar with amber accent --- */
  // Amber accent line at top
  doc.setFillColor(245, 158, 11); // #f59e0b
  doc.rect(0, 0, pageWidth, 6, 'F');

  y = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(245, 158, 11); // #f59e0b amber
  doc.text(title, margin, y);
  y += 12;

  // Subtitle with date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175); // #9CA3AF
  doc.text(`FounderSim AI-Generated Document  \u2022  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y + 14);
  y += 30;

  // Separator line
  doc.setDrawColor(232, 234, 240); // #E8EAF0
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  /* --- Embedded image (if provided) --- */
  if (imageBase64) {
    try {
      // Detect image format: PNG starts with iVBOR, JPEG with /9j/
      const format = imageBase64.startsWith('/9j/') ? 'JPEG' : 'PNG';
      const dataUri = format === 'JPEG'
        ? `data:image/jpeg;base64,${imageBase64}`
        : `data:image/png;base64,${imageBase64}`;
      const imgHeight = maxWidth * 0.5;
      // Check if image fits on current page
      if (y + imgHeight + 20 > pageHeight - 60) {
        doc.addPage();
        y = 50;
      }
      doc.addImage(dataUri, format, margin, y, maxWidth, imgHeight);
      y += imgHeight + 20;
    } catch {
      /* image embed failed, continue without it */
    }
  }

  /* --- Pre-process content into structured lines --- */
  // Split content into lines, preserving markdown structure for formatting
  const rawLines = content.split('\n');
  const bulletIndent = 12;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    // Skip empty lines but add spacing
    if (!trimmed) {
      y += 8;
      continue;
    }

    // Skip markdown table separator rows
    if (/^\|?[\s\-:|]+\|?$/.test(trimmed)) continue;
    // Skip horizontal rules
    if (/^---+$/.test(trimmed)) {
      if (y + 10 > pageHeight - 60) { doc.addPage(); y = 50; }
      doc.setDrawColor(232, 234, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
      continue;
    }

    // Detect heading levels
    const h1Match = trimmed.match(/^#\s+(.+)/);
    const h2Match = trimmed.match(/^##\s+(.+)/);
    const h3Match = trimmed.match(/^###\s+(.+)/);
    const h4Match = trimmed.match(/^####\s+(.+)/);

    // Clean inline markdown from text
    const cleanInline = (t: string) => t
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    if (h1Match || h2Match) {
      const headerText = cleanInline((h1Match || h2Match)![1]);
      y += 14;
      if (y + 24 > pageHeight - 60) { doc.addPage(); y = 50; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(h1Match ? 18 : 15);
      doc.setTextColor(59, 130, 246); // #3b82f6 blue
      const headerLines: string[] = doc.splitTextToSize(headerText, maxWidth);
      for (const hl of headerLines) {
        if (y > pageHeight - 60) { doc.addPage(); y = 50; }
        doc.text(hl, margin, y);
        y += h1Match ? 22 : 20;
      }
      // Underline for h1
      if (h1Match) {
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.75);
        doc.line(margin, y - 8, margin + Math.min(doc.getTextWidth(headerText), maxWidth), y - 8);
      }
      y += 4;
      continue;
    }

    if (h3Match || h4Match) {
      const headerText = cleanInline((h3Match || h4Match)![1]);
      y += 8;
      if (y + 18 > pageHeight - 60) { doc.addPage(); y = 50; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(55, 65, 81); // #374151 dark gray
      const headerLines: string[] = doc.splitTextToSize(headerText, maxWidth);
      for (const hl of headerLines) {
        if (y > pageHeight - 60) { doc.addPage(); y = 50; }
        doc.text(hl, margin, y);
        y += 16;
      }
      y += 2;
      continue;
    }

    // Detect bullet points
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)/);
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);

    if (bulletMatch) {
      const bulletText = cleanInline(bulletMatch[1]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const wrappedLines: string[] = doc.splitTextToSize(bulletText, maxWidth - bulletIndent - 10);
      for (let li = 0; li < wrappedLines.length; li++) {
        if (y > pageHeight - 60) { doc.addPage(); y = 50; }
        if (li === 0) {
          doc.setTextColor(245, 158, 11); // amber bullet
          doc.text('\u2022', margin + bulletIndent, y);
          doc.setTextColor(55, 65, 81);
          doc.text(wrappedLines[li], margin + bulletIndent + 10, y);
        } else {
          doc.text(wrappedLines[li], margin + bulletIndent + 10, y);
        }
        y += 15;
      }
      continue;
    }

    if (numberedMatch) {
      const numLabel = `${numberedMatch[1]}.`;
      const numText = cleanInline(numberedMatch[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const wrappedLines: string[] = doc.splitTextToSize(numText, maxWidth - bulletIndent - 16);
      for (let li = 0; li < wrappedLines.length; li++) {
        if (y > pageHeight - 60) { doc.addPage(); y = 50; }
        if (li === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246); // blue number
          doc.text(numLabel, margin + bulletIndent, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          doc.text(wrappedLines[li], margin + bulletIndent + 16, y);
        } else {
          doc.text(wrappedLines[li], margin + bulletIndent + 16, y);
        }
        y += 15;
      }
      continue;
    }

    // Detect table rows (simple | col | col | rendering)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').filter(c => c.trim()).map(c => cleanInline(c.trim()));
      if (cells.length > 0) {
        if (y + 18 > pageHeight - 60) { doc.addPage(); y = 50; }
        // Use smaller font for tables with many columns
        const fontSize = cells.length > 4 ? 7 : cells.length > 3 ? 8 : 9;
        const colWidth = maxWidth / cells.length;
        const isHeader = cells.some(c => /^\*\*.*\*\*$/.test(c.trim())) || rawLines.indexOf(rawLine) === rawLines.findIndex(l => l.trim().startsWith('|'));
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(isHeader ? 17 : 55, isHeader ? 24 : 65, isHeader ? 39 : 81);
        if (isHeader) {
          doc.setFillColor(243, 244, 246);
          doc.rect(margin, y - 10, maxWidth, 14, 'F');
        }
        for (let ci = 0; ci < cells.length; ci++) {
          // Wrap text within cell width
          const maxChars = Math.max(12, Math.floor(colWidth / (fontSize * 0.45)));
          const cellText = cells[ci].length > maxChars ? cells[ci].substring(0, maxChars - 2) + '..' : cells[ci];
          doc.text(cellText, margin + ci * colWidth + 2, y);
        }
        y += 14;
        continue;
      }
    }

    // Regular paragraph text
    const cleanedLine = cleanInline(trimmed);
    // Detect standalone header-like lines (all caps or Title Case ending with colon)
    const isStandaloneHeader = (
      (cleanedLine.match(/^[A-Z][A-Za-z\s&/]+:?\s*$/) && cleanedLine.length < 60) ||
      cleanedLine === cleanedLine.toUpperCase() && cleanedLine.length > 3 && cleanedLine.length < 60
    );

    if (isStandaloneHeader) {
      y += 10;
      if (y + 18 > pageHeight - 60) { doc.addPage(); y = 50; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(59, 130, 246); // blue
      doc.text(cleanedLine, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      y += 20;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const wrappedLines: string[] = doc.splitTextToSize(cleanedLine, maxWidth);
      for (const wl of wrappedLines) {
        if (y > pageHeight - 60) { doc.addPage(); y = 50; }
        doc.text(wl, margin, y);
        y += 15;
      }
    }
  }

  /* --- Professional footer on each page --- */
  const pageCount = doc.getNumberOfPages();
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer separator line
    doc.setDrawColor(232, 234, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 45, pageWidth - margin, pageHeight - 45);
    // Left: branding
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11); // amber
    doc.text('FounderSim', margin, pageHeight - 30);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`  \u2022  AI-Generated  \u2022  ${timestamp}`, margin + doc.getTextWidth('FounderSim'), pageHeight - 30);
    // Right: page number
    const pageText = `Page ${i} of ${pageCount}`;
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(pageText, pageWidth - margin, pageHeight - 30, { align: 'right' });
  }

  doc.save(filename);
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
/*  Markdown components (light theme / file-preview style)             */
/* ------------------------------------------------------------------ */

function buildPreviewMarkdownComponents() {
  const accent = '#7c3aed';
  return {
    h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
      <h1 className="text-lg font-bold mt-4 mb-2 pb-1.5" style={{ color: '#111827', borderBottom: '1px solid #E8EAF0' }} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
      <h2 className="text-base font-bold mt-3.5 mb-1.5" style={{ color: '#111827' }} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
      <h3 className="text-sm font-semibold mt-3 mb-1" style={{ color: '#374151' }} {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
      <p className="mb-2.5 text-[13px] leading-[1.75]" style={{ color: '#374151' }} {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
      <ul className="mb-2.5 ml-4 space-y-1 list-disc marker:text-[#9CA3AF]" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
      <ol className="mb-2.5 ml-4 space-y-1 list-decimal marker:text-[#9CA3AF]" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => (
      <li className="text-[13px] leading-[1.7] pl-0.5" style={{ color: '#374151' }} {...props}>{children}</li>
    ),
    a: ({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: accent }} {...props}>{children}</a>
    ),
    strong: ({ children, ...props }: ComponentPropsWithoutRef<'strong'>) => (
      <strong className="font-semibold" style={{ color: '#111827' }} {...props}>{children}</strong>
    ),
    blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote className="my-2.5 pl-3 py-1 text-[12px] italic rounded-r-md" style={{ color: '#6B7280', borderLeft: '3px solid #E8EAF0', background: '#F8F9FB' }} {...props}>{children}</blockquote>
    ),
    hr: (props: ComponentPropsWithoutRef<'hr'>) => (
      <hr className="my-3 border-0 h-px" style={{ background: '#E8EAF0' }} {...props} />
    ),
    code: ({ children, className, ...props }: ComponentPropsWithoutRef<'code'>) => {
      const isBlock = typeof className === 'string' && className.startsWith('language-');
      if (isBlock) {
        const lang = className?.replace('language-', '') ?? '';
        return (
          <div className="my-2.5 rounded-lg overflow-hidden" style={{ border: '1px solid #E8EAF0' }}>
            {lang && (
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ background: '#F3F4F6', color: '#9CA3AF', borderBottom: '1px solid #E8EAF0' }}>
                {lang}
              </div>
            )}
            <pre className="p-3 overflow-x-auto text-[12px] leading-[1.7] m-0" style={{ background: '#F8F9FB' }}>
              <code className="font-mono" style={{ color: '#374151' }} {...props}>{children}</code>
            </pre>
          </div>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded text-[12px] font-mono" style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E8EAF0' }} {...props}>{children}</code>
      );
    },
    pre: ({ children }: ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
    table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
      <div className="my-2.5 overflow-x-auto rounded-lg" style={{ border: '1px solid #E8EAF0' }}>
        <table className="w-full text-[12px] border-collapse" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }: ComponentPropsWithoutRef<'thead'>) => (
      <thead style={{ background: '#F3F4F6' }} {...props}>{children}</thead>
    ),
    th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
      <th className="text-left px-3 py-2 font-semibold text-[11px] uppercase tracking-wider" style={{ color: '#6B7280', borderBottom: '1px solid #E8EAF0' }} {...props}>{children}</th>
    ),
    tr: ({ children, ...props }: ComponentPropsWithoutRef<'tr'>) => (
      <tr className="even:bg-[#F8F9FB] hover:bg-[#F3F4F6]" style={{ borderBottom: '1px solid #F3F4F6' }} {...props}>{children}</tr>
    ),
    td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
      <td className="px-3 py-2" style={{ color: '#374151' }} {...props}>{children}</td>
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
      const title = artifact.filename.replace('.pdf', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      downloadAsPDF(artifact.filename, artifact.content, title, artifact.associatedImage);
    }
  }, [artifact]);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-200"
      style={{
        background: isExpanded ? '#F8F9FB' : '#FFFFFF',
        border: `1px solid ${isExpanded ? '#E8EAF0' : '#F3F4F6'}`,
      }}
    >
      {/* Row header (always visible) */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 select-none"
        style={{ background: isExpanded ? '#F3F4F6' : undefined }}
        onClick={onToggle}
        onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#F8F9FB'; }}
        onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = ''; }}
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
            color: '#9CA3AF',
          }}
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Icon + filename */}
        <span className="text-base shrink-0">{artifact.icon}</span>
        <span className="text-[13px] font-medium truncate flex-1" style={{ color: '#111827' }}>
          {artifact.filename}
        </span>

        {/* Agent badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: artifact.agentColor }}
          />
          <span className="text-[11px] hidden sm:inline" style={{ color: artifact.agentColor }}>
            {artifact.agentName.split(' ')[0]}
          </span>
        </div>

        {/* File size */}
        <span className="text-[11px] font-mono w-16 text-right shrink-0" style={{ color: '#9CA3AF' }}>
          {fileSize}
        </span>

        {/* Status badge */}
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
          style={
            isReady
              ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
              : { background: '#F3F4F6', color: '#9CA3AF', border: '1px solid #E8EAF0' }
          }
        >
          {isReady ? 'Ready' : 'Pending'}
        </span>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!isReady}
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer disabled:opacity-20 disabled:cursor-default hover:bg-[#F3F4F6]"
          style={{ background: 'transparent', border: 'none', color: '#6B7280' }}
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
          style={{ borderTop: '1px solid #E8EAF0' }}
        >
          {artifact.isBinary ? (
            /* Logo image preview */
            <div className="pt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${artifact.mimeType};base64,${artifact.content}`}
                alt={artifact.filename}
                className="max-w-[200px] max-h-[200px] rounded-lg"
                style={{ border: '1px solid #E8EAF0' }}
              />
            </div>
          ) : (
            /* Markdown preview */
            <div
              className="pt-4 max-h-[400px] overflow-y-auto pr-2"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="prose prose-sm max-w-none">
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
        <div className="px-4 pb-4" style={{ borderTop: '1px solid #E8EAF0' }}>
          <div className="pt-4 flex flex-col items-center py-8 text-center">
            <div
              className="w-10 h-10 rounded-full mb-3 flex items-center justify-center"
              style={{ background: '#F8F9FB', border: '1px solid #E8EAF0' }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  border: '2px solid #E8EAF0',
                  borderTopColor: artifact.agentColor,
                  animation: 'artifact-spin 0.8s linear infinite',
                }}
              />
            </div>
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>
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
  marketMapBase64,
  archDiagramBase64,
  productMockupBase64,
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
        filename: 'company-brief.pdf',
        icon: '\u{1F4C4}',
        agentId: 'ceo',
        agentName: ceo.name,
        agentColor: ceo.color,
        content: companyBrief || null,
        mimeType: 'application/pdf',
        isBinary: false,
        associatedImage: logoBase64,
      },
      {
        id: 'research',
        filename: 'competitive-analysis.pdf',
        icon: '\u{1F4CA}',
        agentId: 'research',
        agentName: research.name,
        agentColor: research.color,
        content: outputs['research'] || null,
        mimeType: 'application/pdf',
        isBinary: false,
        associatedImage: marketMapBase64,
      },
      {
        id: 'product',
        filename: 'product-requirements.pdf',
        icon: '\u{1F4CB}',
        agentId: 'product',
        agentName: product.name,
        agentColor: product.color,
        content: outputs['product'] || null,
        mimeType: 'application/pdf',
        isBinary: false,
        associatedImage: productMockupBase64,
      },
      {
        id: 'architect',
        filename: 'architecture.pdf',
        icon: '\u{1F3D7}',
        agentId: 'architect',
        agentName: architect.name,
        agentColor: architect.color,
        content: outputs['architect'] || null,
        mimeType: 'application/pdf',
        isBinary: false,
        associatedImage: archDiagramBase64,
      },
      {
        id: 'developer',
        filename: 'generated-code.pdf',
        icon: '\u{1F4BB}',
        agentId: 'developer',
        agentName: developer.name,
        agentColor: developer.color,
        content: outputs['developer'] || null,
        mimeType: 'application/pdf',
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

    if (marketMapBase64) {
      entries.push({
        id: 'market_map',
        filename: 'market-map.png',
        icon: '\u{1F5FA}',
        agentId: 'research',
        agentName: research.name,
        agentColor: research.color,
        content: marketMapBase64,
        mimeType: 'image/png',
        isBinary: true,
      });
    }

    if (productMockupBase64) {
      entries.push({
        id: 'product_mockup',
        filename: 'product-mockup.png',
        icon: '\u{1F4F1}',
        agentId: 'product',
        agentName: product.name,
        agentColor: product.color,
        content: productMockupBase64,
        mimeType: 'image/png',
        isBinary: true,
      });
    }

    if (archDiagramBase64) {
      entries.push({
        id: 'architecture_diagram',
        filename: 'architecture-diagram.png',
        icon: '\u{1F3D7}',
        agentId: 'architect',
        agentName: architect.name,
        agentColor: architect.color,
        content: archDiagramBase64,
        mimeType: 'image/png',
        isBinary: true,
      });
    }

    return entries;
  }, [outputs, companyBrief, logoBase64, marketMapBase64, archDiagramBase64, productMockupBase64]);

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
        const title = artifact.filename.replace('.pdf', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        downloadAsPDF(artifact.filename, artifact.content, title, artifact.associatedImage);
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
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full flex flex-col"
        style={{
          width: 'min(520px, 90vw)',
          background: '#FFFFFF',
          borderLeft: '1px solid #E8EAF0',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
          animation: 'artifact-slide-in 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #E8EAF0' }}
        >
          <div className="flex items-center gap-3">
            {/* Folder icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
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
              <h2 className="text-[15px] font-bold" style={{ color: '#111827' }}>Artifacts</h2>
              <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                {readyCount}/{totalCount} files &middot; {formatFileSize(totalBytes)}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 cursor-pointer hover:bg-[#F3F4F6]"
            style={{ background: 'transparent', border: 'none', color: '#9CA3AF' }}
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
            style={{ borderBottom: '1px solid #E8EAF0', background: '#F8F9FB' }}
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#9CA3AF' }}>
              Pipeline Progress
            </span>
            <span className="text-[11px] font-mono" style={{ color: '#9CA3AF' }}>
              {readyCount}/{totalCount}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: '#E8EAF0' }}
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
          style={{ borderTop: '1px solid #E8EAF0', background: '#F8F9FB' }}
        >
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
            {readyCount === totalCount && readyCount > 0
              ? 'All artifacts ready'
              : `${totalCount - readyCount} artifact${totalCount - readyCount !== 1 ? 's' : ''} pending`}
          </span>
          <button
            onClick={handleDownloadAll}
            disabled={readyCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-default"
            style={{
              background: readyCount > 0 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : '#F3F4F6',
              color: readyCount > 0 ? '#fff' : '#9CA3AF',
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
