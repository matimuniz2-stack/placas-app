import React from 'react';
import type { LayerConfig } from '@/types';
import { usePlacaStore } from '@/lib/store';

interface Props {
  defaults: LayerConfig;
  interactive?: boolean;
}

export const Logo: React.FC<Props> = ({ defaults, interactive = true }) => {
  const override = usePlacaStore((s) => s.layerOverrides.logo) || {};
  const logoUrl = usePlacaStore((s) => s.theme.logoUrl);
  const selected = usePlacaStore((s) => s.selectedLayer === 'logo');
  const select = usePlacaStore((s) => s.selectLayer);
  const layer = { ...defaults, ...override };
  if (layer.visible === false) return null;

  const showOutline = interactive && selected;

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
        outline: showOutline ? '2px dashed #de1f1a' : undefined,
        outlineOffset: showOutline ? 4 : undefined,
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onClick={interactive ? (e) => { e.stopPropagation(); select('logo'); } : undefined}
    >
      <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
};
