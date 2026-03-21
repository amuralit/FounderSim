'use client';

import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';

interface Slide {
  title: string;
  subtitle?: string;
  body?: string;
  bg?: string;
}

interface PitchDeckProps {
  slides: Slide[];
  onClose: () => void;
  logoBase64?: string | null;
  competitiveVisual?: string | null;
}

function cleanSlideBody(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')                    // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // bold
    .replace(/\*([^*]+)\*/g, '$1')                // italic
    .replace(/`([^`]+)`/g, '$1')                  // inline code
    .replace(/^\s*[-*]\s+/gm, '• ')               // bullets
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // links
    .replace(/\|.*\|/g, '')                        // table rows
    .replace(/^---+$/gm, '')                       // horizontal rules
    .replace(/\n{3,}/g, '\n\n')                    // collapse excess newlines
    .trim();
}

export default function PitchDeck({ slides, onClose, logoBase64, competitiveVisual }: PitchDeckProps) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(slides.length - 1, c + 1)), [slides.length]);

  const downloadPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [1280, 720] });

    slides.forEach((slide, i) => {
      if (i > 0) doc.addPage([1280, 720], 'landscape');

      // Background
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 1280, 720, 'F');

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(i === 0 ? 48 : 36);
      doc.setTextColor(245, 158, 11);
      const titleLines = doc.splitTextToSize(slide.title, 1000);
      doc.text(titleLines, 640, i === 0 ? 280 : 120, { align: 'center' });

      // Subtitle (cover only)
      if (slide.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(20);
        doc.setTextColor(148, 163, 184);
        doc.text(slide.subtitle, 640, 340, { align: 'center' });
      }

      // Body
      if (slide.body) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(18);
        doc.setTextColor(203, 213, 225);
        const bodyLines = doc.splitTextToSize(cleanSlideBody(slide.body), 900);
        doc.text(bodyLines, 190, 200, { align: 'left' });
      }

      // Slide number
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`${i + 1} / ${slides.length}`, 1240, 700, { align: 'right' });
    });

    const filename = slides[0]?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'pitch-deck';
    doc.save(`${filename}-pitch-deck.pdf`);
  }, [slides]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  const slide = slides[current];
  const isCover = current === 0;
  const isMarketOrEdge = slide.title === 'Market Size' || slide.title === 'Our Edge';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-[80%] max-w-[720px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          aspectRatio: '16/9',
          background: isCover ? '#0f172a' : '#FFFFFF',
          border: isCover ? '1px solid #1e293b' : '1px solid #E8EAF0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-1 flex items-center justify-center p-12"
          style={{
            background: isCover ? 'linear-gradient(135deg, #0f172a, #1e293b)' : '#FFFFFF',
            textAlign: isCover ? 'center' : 'left',
          }}
        >
          <div className={isCover ? 'flex flex-col items-center' : 'w-full max-w-[540px] mx-auto'}>
            {/* Logo on cover slide */}
            {isCover && logoBase64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${logoBase64}`}
                alt="Company logo"
                className="mb-6 rounded-lg"
                style={{ maxWidth: 80, maxHeight: 80, objectFit: 'contain' }}
              />
            )}
            <h2
              className="font-bold mb-4"
              style={{
                fontSize: isCover ? 40 : 28,
                lineHeight: 1.2,
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: isCover ? 'center' : 'left',
              }}
            >
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-lg" style={{ color: isCover ? '#94a3b8' : '#6B7280', textAlign: 'center' }}>{slide.subtitle}</p>
            )}
            {/* Competitive visual on Market Size or Our Edge slide */}
            {isMarketOrEdge && competitiveVisual && (
              <div className="flex justify-center my-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${competitiveVisual}`}
                  alt="Competitive positioning"
                  className="rounded-lg"
                  style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
              </div>
            )}
            {slide.body && (
              <p
                className="text-[15px] leading-[1.9] whitespace-pre-line mt-2"
                style={{ color: isCover ? '#cbd5e1' : '#374151' }}
              >
                {cleanSlideBody(slide.body)}
              </p>
            )}
          </div>
        </div>

        <div
          className="flex justify-between items-center px-5 py-3"
          style={{
            borderTop: isCover ? '1px solid #1e293b' : '1px solid #E8EAF0',
            background: isCover ? '#0f172a' : '#FFFFFF',
          }}
        >
          <button
            onClick={prev}
            disabled={current === 0}
            className="px-4 py-1.5 rounded-md text-[13px] cursor-pointer"
            style={{
              background: isCover ? '#1e293b' : '#F3F4F6',
              border: isCover ? '1px solid #334155' : '1px solid #E8EAF0',
              color: current === 0 ? (isCover ? '#475569' : '#D1D5DB') : (isCover ? '#94a3b8' : '#6B7280'),
            }}
          >
            Prev
          </button>
          <span className="text-xs font-medium" style={{ color: isCover ? '#64748b' : '#9CA3AF' }}>
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={downloadPDF}
            className="px-4 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: isCover ? '#1e293b' : '#F3F4F6',
              border: isCover ? '1px solid #334155' : '1px solid #E8EAF0',
              color: isCover ? '#94a3b8' : '#6B7280',
            }}
          >
            Download PDF
          </button>
          <button
            onClick={next}
            disabled={current === slides.length - 1}
            className="px-4 py-1.5 rounded-md text-[13px] font-semibold text-white cursor-pointer"
            style={{
              background: current === slides.length - 1 ? (isCover ? '#1e293b' : '#F3F4F6') : '#f59e0b',
              border: 'none',
              color: current === slides.length - 1 ? (isCover ? '#475569' : '#D1D5DB') : '#fff',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
