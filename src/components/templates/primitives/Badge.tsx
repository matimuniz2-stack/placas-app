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
// overflow:hidden del placa root). Geometría en % del canvas; los defaults deben
// espejar la base de getEffectiveLayer('badge') en store.ts para que moveable
// (drag/resize/rotate) y el render coincidan. Resize escala tipografía y alto.
const RIBBON_BASE = { x: -21.8, y: 3, w: 74, rotation: -36 };

const Ribbon: React.FC<{ b: BadgeDef }> = ({ b }) => {
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'badge');
  const override = usePlacaStore((s) => s.layerOverrides.badge);
  const pos = { ...RIBBON_BASE, ...(override || {}) };
  const k = pos.w / RIBBON_BASE.w;
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
        width: `${pos.w}%`,
        padding: `${34 * k}px 0`,
        transform: `rotate(${pos.rotation ?? RIBBON_BASE.rotation}deg)`,
        background: b.bg,
        color: b.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter',
        fontWeight: 800,
        fontSize: 62 * k,
        letterSpacing: 12 * k,
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

  const PILL_BASE = { x: 70, y: 4, w: 26, rotation: 0 };
  const pos = { ...PILL_BASE, ...(override || {}) };
  const k = pos.w / PILL_BASE.w;

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
        width: `${pos.w}%`,
        transform: `rotate(${pos.rotation ?? 0}deg)`,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8 * k,
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
            fontSize: 18 * k,
            padding: `${10 * k}px ${22 * k}px`,
            letterSpacing: 4 * k,
            whiteSpace: 'nowrap',
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
