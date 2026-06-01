import React from 'react';
import { usePlacaStore, getEffectiveLayer, getCurrentTemplate } from '@/lib/store';
import type { LayerId } from '@/types';

const CELL_IDS: LayerId[] = ['g0', 'g1', 'g2', 'g3'];
const SHADOW = '0 10px 30px rgba(43,26,20,0.08)';

export const GalleryGrid: React.FC<{ interactive?: boolean }> = ({ interactive = true }) => {
  const photos = usePlacaStore((s) => s.photos);
  const galleryCells = usePlacaStore((s) => s.galleryCells);
  // suscribirse para re-render cuando se mueve/redimensiona o cambia la plantilla
  usePlacaStore((s) => s.layerOverrides);
  const templateId = usePlacaStore((s) => s.templateId);
  const selected = usePlacaStore((s) => s.selectedLayer);
  const select = usePlacaStore((s) => s.selectLayer);
  const tpl = getCurrentTemplate();
  void templateId;

  return (
    <>
      {CELL_IDS.map((id, i) => {
        if (!tpl.defaultLayers[id]) return null;
        const layer = getEffectiveLayer(id);
        if (!layer || layer.visible === false) return null;

        const idx = galleryCells[id] ?? i;
        const p = photos[idx];
        const isSel = interactive && selected === id;

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
              borderRadius: layer.radius ?? 24,
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
          </div>
        );
      })}
    </>
  );
};
