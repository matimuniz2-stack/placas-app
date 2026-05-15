import React from 'react';
import type { LayerConfig } from '@/types';
import { usePlacaStore } from '@/lib/store';

interface Props {
  defaults: LayerConfig;
  fullbleed?: boolean;
  background?: string; // CSS to use when no photo
}

export const Photo: React.FC<Props> = ({ defaults, fullbleed, background }) => {
  const override = usePlacaStore((s) => s.layerOverrides.photo) || {};
  const photos = usePlacaStore((s) => s.photos);
  const activeIdx = usePlacaStore((s) => s.activePhotoIdx);
  const selected = usePlacaStore((s) => s.selectedLayer === 'photo');
  const select = usePlacaStore((s) => s.selectLayer);
  const layer = { ...defaults, ...override };

  const active = photos[activeIdx];

  const baseStyle: React.CSSProperties = fullbleed
    ? { position: 'absolute', inset: 0 }
    : {
        position: 'absolute',
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.w}%`,
        height: `${layer.h}%`,
      };

  const photoBg = active
    ? {
        backgroundImage: `url("${active.url}")`,
        backgroundSize: active.zoom === 1 ? 'cover' : `${active.zoom * 100}%`,
        backgroundPosition: `${active.pos.x}% ${active.pos.y}%`,
        backgroundRepeat: 'no-repeat',
        filter: `brightness(${active.filter.b}%) contrast(${active.filter.c}%) saturate(${active.filter.s}%)`,
      }
    : {
        background: background || 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
      };

  return (
    <div
      data-layer="photo"
      style={{
        ...baseStyle,
        ...photoBg,
        zIndex: layer.z ?? 0,
        outline: selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: selected ? -2 : undefined,
        cursor: active ? 'grab' : 'default',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        select('photo');
      }}
    >
      {!active && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#737373',
            fontSize: 24,
            fontFamily: 'IBM Plex Mono, monospace',
            letterSpacing: 3,
          }}
        >
          SUBÍ UNA FOTO
        </div>
      )}
    </div>
  );
};
