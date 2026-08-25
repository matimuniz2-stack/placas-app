import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { usePlacaStore } from '@/lib/store';

export const QRLayer: React.FC = () => {
  const url = usePlacaStore((s) => s.qrUrl);
  const override = usePlacaStore((s) => s.layerOverrides.qr);
  const select = usePlacaStore((s) => s.selectLayer);
  const selected = usePlacaStore((s) => s.selectedLayer === 'qr');
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setDataUrl('');
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0a0a0a', light: '#ffffff' } }).then(setDataUrl);
  }, [url]);

  if (!url || !dataUrl) return null;
  // Defaults espejan la base de getEffectiveLayer('qr') en store.ts.
  const pos = { x: 84, y: 88, w: 12, rotation: 0, ...(override || {}) };

  return (
    <div
      data-layer="qr"
      style={{
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        transform: `rotate(${pos.rotation ?? 0}deg)`,
        background: '#fff',
        padding: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        zIndex: 30,
        outline: selected ? '2px dashed #de1f1a' : undefined,
        outlineOffset: 4,
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        select('qr');
      }}
    >
      <img src={dataUrl} alt="QR" style={{ width: '100%', display: 'block' }} />
    </div>
  );
};
