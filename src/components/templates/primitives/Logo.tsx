import React from 'react';
import type { LayerConfig } from '@/types';
import { usePlacaStore } from '@/lib/store';

interface Props {
  defaults: LayerConfig;
}

export const Logo: React.FC<Props> = ({ defaults }) => {
  const override = usePlacaStore((s) => s.layerOverrides.logo) || {};
  const logoUrl = usePlacaStore((s) => s.theme.logoUrl);
  const selected = usePlacaStore((s) => s.selectedLayer === 'logo');
  const select = usePlacaStore((s) => s.selectLayer);
  const layer = { ...defaults, ...override };
  if (layer.visible === false) return null;

  return (
    <div
      data-layer="logo"
      style={{
        position: 'absolute',
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.w}%`,
        height: layer.h ? `${layer.h}%` : 'auto',
        transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
        opacity: layer.opacity,
        zIndex: layer.z ?? 10,
        outline: selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: selected ? 4 : undefined,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        select('logo');
      }}
    >
      <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
};
