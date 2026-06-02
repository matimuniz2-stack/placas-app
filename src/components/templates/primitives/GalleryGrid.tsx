import React from 'react';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { galleryCount } from '@/lib/galleryLayout';
import type { LayerId } from '@/types';

const SHADOW = '0 10px 30px rgba(43,26,20,0.08)';

export const GalleryGrid: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const photos = usePlacaStore((s) => s.photos);
  const galleryCells = usePlacaStore((s) => s.galleryCells);
  // suscribirse para re-render al mover/redimensionar/ocultar celdas
  usePlacaStore((s) => s.layerOverrides);
  const selected = usePlacaStore((s) => s.selectedLayer);
  const select = usePlacaStore((s) => s.selectLayer);

  const count = galleryCount(photos.length);
  const rest = Math.max(0, photos.length - 1);
  const extra = rest - count; // fotos que no entran (badge "+N")

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const id = `g${i}` as LayerId;
        const layer = getEffectiveLayer(id);
        if (!layer || layer.visible === false) return null; // celda oculta = "borrada"

        const photoIdx = galleryCells[id] ?? i + 1; // +1: saltear la portada
        const p = photos[photoIdx];
        const isSel = interactive && selected === id;
        const isLast = i === count - 1;

        const bgStyle: React.CSSProperties = p
          ? {
              backgroundImage: `url("${p.url}")`,
              backgroundSize: p.zoom === 1 ? 'cover' : `${p.zoom * 100}%`,
              backgroundPosition: `${p.pos.x}% ${p.pos.y}%`,
              backgroundRepeat: 'no-repeat',
              filter: `brightness(${p.filter.b}%) contrast(${p.filter.c}%) saturate(${p.filter.s}%)`,
            }
          : { background: 'rgba(43,26,20,0.06)' };

        return (
          <div
            key={id}
            data-layer={id}
            onClick={interactive ? (e) => { e.stopPropagation(); select(id); } : undefined}
            style={{
              position: 'absolute',
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.w}%`,
              height: `${layer.h}%`,
              transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
              borderRadius: layer.radius ?? 22,
              boxShadow: SHADOW,
              overflow: 'hidden',
              zIndex: layer.z ?? 2,
              opacity: layer.opacity,
              outline: isSel ? '2px dashed #de1f1a' : undefined,
              outlineOffset: 2,
              cursor: interactive ? 'pointer' : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
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
            {isLast && extra > 0 && (
              <div
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                  background: 'rgba(43,26,20,0.78)',
                  color: '#f4ebdd',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 26,
                  letterSpacing: 0.5,
                  padding: '8px 18px',
                  borderRadius: 999,
                }}
              >
                +{extra}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
