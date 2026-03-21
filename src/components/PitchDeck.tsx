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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-[80%] max-w-[720px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          aspectRatio: '16/9',
          background: '#12121a',
          border: '1px solid #2a2a3a',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex-1 flex items-center justify-center p-12 text-center"
          style={{ background: slide.bg || '#12121a' }}
        >
          <div>
            <h2
              className="font-bold mb-3"
              style={{
                fontSize: current === 0 ? 36 : 28,
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-lg" style={{ color: '#888' }}>{slide.subtitle}</p>
            )}
            {slide.body && (
              <p
                className="text-[15px] leading-[1.8] max-w-[500px] mx-auto text-left whitespace-pre-line"
                style={{ color: '#bbb' }}
              >
                {slide.body}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-5 py-3" style={{ borderTop: '1px solid #1e1e2e' }}>
          <button
            onClick={prev}
            disabled={current === 0}
            className="px-4 py-1.5 rounded-md text-[13px] cursor-pointer"
            style={{
              background: '#1a1a28',
              border: '1px solid #333',
              color: current === 0 ? '#333' : '#ccc',
            }}
          >
            ← Prev
          </button>
          <span className="text-xs" style={{ color: '#666' }}>
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={next}
            disabled={current === slides.length - 1}
            className="px-4 py-1.5 rounded-md text-[13px] font-semibold text-white cursor-pointer"
            style={{
              background: current === slides.length - 1 ? '#1a1a28' : '#f59e0b',
              border: 'none',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
