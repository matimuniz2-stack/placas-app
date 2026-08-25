import React from 'react';
import { usePlacaStore } from '@/lib/store';

export interface BadgeDef {
  id: string;
  label: string;
  bg: string;
  fg: string;
  ribbon?: boolean; // banda diagonal que cruza la esquina superior izquierda
}

export const BADGE_PRESETS: BadgeDef[] = [
  { id: 'reservado', label: 'RESERVADO', bg: '#de1f1a', fg: '#ffffff', ribbon: true },
  { id: 'disponible', label: 'DISPONIBLE', bg: '#de1f1a', fg: '#ffffff' },
  { id: 'nuevo', label: 'NUEVO', bg: '#de1f1a', fg: '#ffffff' },
  { id: 'rebajado', label: 'REBAJADO', bg: '#0a0a0a', fg: '#ffffff' },
  { id: 'exclusivo', label: 'EXCLUSIVO', bg: '#c9a86b', fg: '#1c1715' },
  { id: 'vendido', label: 'VENDIDO', bg: '#2d6b3c', fg: '#ffffff' },
  { id: 'apertura', label: 'ABIERTO HOY', bg: '#0066cc', fg: '#ffffff' },
  { id: 'permuta', label: 'TOMA PERMUTA', bg: '#9c7a35', fg: '#ffffff' },
];

// Banda diagonal cruzando la esquina superior izquierda (queda recortada por el
// overflow:hidden del placa root). Medidas en px sobre el canvas de 1080 de ancho.
const Ribbon: React.FC<{ b: BadgeDef }> = ({ b }) => {
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'badge');
  return (
    <div
      data-layer="badge"
      onClick={(e) => {
        e.stopPropagation();
        select('badge');
      }}
      style={{
        position: 'absolute',
        left: -235,
        top: 57,
        width: 800,
        height: 130,
        transform: 'rotate(-36deg)',
        background: b.bg,
        color: b.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
        fontWeight: 800,
        fontSize: 62,
        letterSpacing: 12,
        textTransform: 'uppercase',
        boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
        zIndex: 30,
        outline: selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: 4,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
    >
      {b.label}
    </div>
  );
};

export const Badges: React.FC = () => {
  const badges = usePlacaStore((s) => s.badges);
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'badge');
  const override = usePlacaStore((s) => s.layerOverrides.badge);
  if (badges.length === 0) return null;

  const active = badges
    .map((bid) => BADGE_PRESETS.find((x) => x.id === bid))
    .filter((b): b is BadgeDef => !!b);
  const ribbons = active.filter((b) => b.ribbon);
  const pills = active.filter((b) => !b.ribbon);

  const pos = override || { x: 70, y: 4, w: 26, h: 6 };

  return (
    <>
      {ribbons.map((b) => (
        <Ribbon key={b.id} b={b} />
      ))}
      {pills.length > 0 && (
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
      {pills.map((b) => (
        <div
          key={b.id}
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
      ))}
        </div>
      )}
    </>
  );
};
