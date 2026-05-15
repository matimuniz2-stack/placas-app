import React from 'react';
import { usePlacaStore } from '@/lib/store';

export interface BadgeDef {
  id: string;
  label: string;
  bg: string;
  fg: string;
}

export const BADGE_PRESETS: BadgeDef[] = [
  { id: 'nuevo', label: 'NUEVO', bg: '#de1f1a', fg: '#ffffff' },
  { id: 'rebajado', label: 'REBAJADO', bg: '#0a0a0a', fg: '#ffffff' },
  { id: 'exclusivo', label: 'EXCLUSIVO', bg: '#c9a86b', fg: '#1c1715' },
  { id: 'vendido', label: 'VENDIDO', bg: '#2d6b3c', fg: '#ffffff' },
  { id: 'apertura', label: 'ABIERTO HOY', bg: '#0066cc', fg: '#ffffff' },
];

export const Badges: React.FC = () => {
  const badges = usePlacaStore((s) => s.badges);
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'badge');
  const override = usePlacaStore((s) => s.layerOverrides.badge);
  if (badges.length === 0) return null;

  const pos = override || { x: 70, y: 4, w: 26, h: 6 };

  return (
    <div
      data-layer="badge"
      onClick={(e) => {
        e.stopPropagation();
        select('badge');
      }}
      style={{
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        outline: selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: 4,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    >
      {badges.map((bid) => {
        const b = BADGE_PRESETS.find((x) => x.id === bid);
        if (!b) return null;
        return (
          <div
            key={bid}
            style={{
              background: b.bg,
              color: b.fg,
              fontFamily: 'Inter',
              fontWeight: 800,
              fontSize: 18,
              padding: '10px 22px',
              letterSpacing: 4,
              transform: 'rotate(-3deg)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          >
            {b.label}
          </div>
        );
      })}
    </div>
  );
};
