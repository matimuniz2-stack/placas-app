import React from 'react';
import type { LayerConfig, LayerId } from '@/types';
import { usePlacaStore } from '@/lib/store';

interface Props {
  id: LayerId;
  defaults: LayerConfig;
  children: React.ReactNode;
  className?: string;
}

export const TextLayer: React.FC<Props> = ({ id, defaults, children, className }) => {
  const override = usePlacaStore((s) => s.layerOverrides[id]) || {};
  const selected = usePlacaStore((s) => s.selectedLayer === id);
  const select = usePlacaStore((s) => s.selectLayer);
  const layer = { ...defaults, ...override };

  if (!layer.visible && layer.visible !== undefined) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: layer.w ? `${layer.w}%` : 'auto',
    height: layer.h ? `${layer.h}%` : 'auto',
    fontFamily: layer.font ? `'${layer.font}'` : undefined,
    fontSize: layer.size ? `${layer.size}px` : undefined,
    fontWeight: layer.weight,
    color: layer.color,
    textAlign: layer.align as any,
    letterSpacing: layer.letterSpacing != null ? `${layer.letterSpacing}px` : undefined,
    lineHeight: layer.lineHeight,
    fontStyle: layer.italic ? 'italic' : undefined,
    textTransform: layer.uppercase ? 'uppercase' : undefined,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    opacity: layer.opacity,
    background: layer.bg,
    border: layer.border,
    borderTop: layer.borderTop,
    padding: layer.padding ? `${layer.padding}px` : undefined,
    zIndex: layer.z ?? 5,
    outline: selected ? '2px dashed #de1f1a' : undefined,
    outlineOffset: selected ? 4 : undefined,
    cursor: 'pointer',
    pointerEvents: 'auto',
    whiteSpace: 'pre-wrap',
  };

  return (
    <div
      data-layer={id}
      className={className}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        select(id);
      }}
    >
      {children}
    </div>
  );
};
