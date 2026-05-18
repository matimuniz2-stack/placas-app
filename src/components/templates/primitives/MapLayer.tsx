import React from 'react';
import { usePlacaStore } from '@/lib/store';

interface Props { interactive?: boolean }

export const MapLayer: React.FC<Props> = ({ interactive = true }) => {
  const url = usePlacaStore((s) => s.mapUrl);
  const override = usePlacaStore((s) => s.layerOverrides.map);
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'map');

  if (!url) return null;
  const pos = override || { x: 4, y: 76, w: 30, h: 0 };

  const showOutline = interactive && selected;

  return (
    <div
      data-layer="map"
      style={{
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        zIndex: 25,
        outline: showOutline ? '2px dashed #de1f1a' : undefined,
        outlineOffset: 4,
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '3px solid #fff',
      }}
      onClick={interactive ? (e) => { e.stopPropagation(); select('map'); } : undefined}
    >
      <img src={url} alt="Mapa del barrio" style={{ width: '100%', display: 'block' }} />
    </div>
  );
};
