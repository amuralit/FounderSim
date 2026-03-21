'use client';

import { useState, useEffect, useCallback } from 'react';

interface Slide {
  title: string;
  subtitle?: string;
  body?: string;
  bg?: string;
}

interface PitchDeckProps {
  slides: Slide[];
  onClose: () => void;
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

export default function PitchDeck({ slides, onClose }: PitchDeckProps) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(slides.length - 1, c + 1)), [slides.length]);

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
          background: '#FFFFFF',
          border: '1px solid #E8EAF0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-1 flex items-center justify-center p-12"
          style={{
            background: slide.bg || '#FFFFFF',
            textAlign: isCover ? 'center' : 'left',
          }}
        >
          <div className={isCover ? '' : 'w-full max-w-[540px] mx-auto'}>
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
              <p className="text-lg" style={{ color: isCover && slide.bg ? '#94a3b8' : '#6B7280', textAlign: 'center' }}>{slide.subtitle}</p>
            )}
            {slide.body && (
              <p
                className="text-[15px] leading-[1.9] whitespace-pre-line mt-2"
                style={{ color: '#374151' }}
              >
                {cleanSlideBody(slide.body)}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-5 py-3" style={{ borderTop: '1px solid #E8EAF0' }}>
          <button
            onClick={prev}
            disabled={current === 0}
            className="px-4 py-1.5 rounded-md text-[13px] cursor-pointer"
            style={{
              background: '#F3F4F6',
              border: '1px solid #E8EAF0',
              color: current === 0 ? '#D1D5DB' : '#6B7280',
            }}
          >
            ← Prev
          </button>
          <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={next}
            disabled={current === slides.length - 1}
            className="px-4 py-1.5 rounded-md text-[13px] font-semibold text-white cursor-pointer"
            style={{
              background: current === slides.length - 1 ? '#F3F4F6' : '#f59e0b',
              border: 'none',
              color: current === slides.length - 1 ? '#D1D5DB' : '#fff',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
