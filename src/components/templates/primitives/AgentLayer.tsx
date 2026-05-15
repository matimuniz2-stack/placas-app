import React from 'react';
import { usePlacaStore } from '@/lib/store';

export const AgentLayer: React.FC = () => {
  const agent = usePlacaStore((s) => s.agent);
  const override = usePlacaStore((s) => s.layerOverrides.agent);
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'agent');

  if (!agent) return null;
  const pos = override || { x: 4, y: 88, w: 30, h: 8 };

  return (
    <div
      data-layer="agent"
      style={{
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        zIndex: 25,
        outline: selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: 4,
        cursor: 'pointer',
        pointerEvents: 'auto',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        color: '#0a0a0a',
        borderRadius: 4,
      }}
      onClick={(e) => {
        e.stopPropagation();
        select('agent');
      }}
    >
      {agent.photoUrl && (
        <img
          src={agent.photoUrl}
          alt={agent.name}
          style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Inter', lineHeight: 1.1 }}>{agent.name}</div>
        {agent.phone && (
          <div style={{ fontSize: 18, color: '#525252', fontFamily: 'Inter', marginTop: 2 }}>{agent.phone}</div>
        )}
      </div>
    </div>
  );
};
