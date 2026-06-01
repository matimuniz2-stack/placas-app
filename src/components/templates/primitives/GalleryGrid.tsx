import React from 'react';
import { usePlacaStore } from '@/lib/store';

const RADIUS = 24;
const SHADOW = '0 10px 30px rgba(43,26,20,0.08)';

interface Cell { left: number; top: number; width: number; height: number; }

// Layouts editoriales por cantidad de fotos (porcentajes del canvas 1080x1920)
function layoutFor(n: number): Cell[] {
  const M = 7.41; // margen 80px
  const FULL = 85.19; // ancho útil
  const GAPX = 2.78; // ~30px
  const HALF = (FULL - GAPX) / 2; // ~41.2
  const RIGHT = M + HALF + GAPX; // 51.39

  if (n >= 4)
    return [
      { left: M, top: 13.5, width: FULL, height: 40 },
      { left: M, top: 55.5, width: HALF, height: 18 },
      { left: RIGHT, top: 55.5, width: HALF, height: 18 },
      { left: M, top: 75.5, width: FULL, height: 13 },
    ];
  if (n === 3)
    return [
      { left: M, top: 13.5, width: FULL, height: 46 },
      { left: M, top: 61.5, width: HALF, height: 27 },
      { left: RIGHT, top: 61.5, width: HALF, height: 27 },
    ];
  if (n === 2)
    return [
      { left: M, top: 13.5, width: FULL, height: 37 },
      { left: M, top: 52.5, width: FULL, height: 36 },
    ];
  if (n === 1) return [{ left: M, top: 15, width: FULL, height: 73 }];
  return [];
}

export const GalleryGrid: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const photos = usePlacaStore((s) => s.photos);
  const activeIdx = usePlacaStore((s) => s.activePhotoIdx);
  const setActive = usePlacaStore((s) => s.setActivePhoto);

  const n = Math.min(photos.length, 4);
  // Con 0 fotos mostramos los 4 placeholders de la grilla principal
  const cells = n > 0 ? layoutFor(n) : layoutFor(4);

  return (
    <>
      {cells.map((c, i) => {
        const p = photos[i];
        const bgStyle: React.CSSProperties = p
          ? {
              backgroundImage: `url("${p.url}")`,
              backgroundSize: p.zoom === 1 ? 'cover' : `${p.zoom * 100}%`,
              backgroundPosition: `${p.pos.x}% ${p.pos.y}%`,
              backgroundRepeat: 'no-repeat',
              filter: `brightness(${p.filter.b}%) contrast(${p.filter.c}%) saturate(${p.filter.s}%)`,
            }
          : { background: 'rgba(43,26,20,0.06)' };
        const isActive = interactive && !!p && i === activeIdx;
        return (
          <div
            key={i}
            onClick={interactive && p ? (e) => { e.stopPropagation(); setActive(i); } : undefined}
            style={{
              position: 'absolute',
              left: `${c.left}%`,
              top: `${c.top}%`,
              width: `${c.width}%`,
              height: `${c.height}%`,
              borderRadius: RADIUS,
              boxShadow: SHADOW,
              overflow: 'hidden',
              zIndex: 2,
              cursor: interactive && p ? 'pointer' : 'default',
              outline: isActive ? '3px solid #d9221f' : undefined,
              outlineOffset: 2,
              ...bgStyle,
            }}
          >
            {!p && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a78b61',
                  fontSize: 22,
                  fontFamily: 'Inter',
                  letterSpacing: 2,
                }}
              >
                FOTO {i + 1}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
