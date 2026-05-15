import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { PlacaRenderer } from '@/components/templates/Renderer';
import { priceString } from '@/lib/format';
import { Heart, MessageCircle, Send, Bookmark, Wifi, Battery, Signal } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'story' | 'post';
}

// iPhone 15 Pro reference: 1290x2796 logical, ~3 aspect screen
// We render the device at a fixed pixel width; screen is inset by the bezel.
const DEVICE_W = 320;
const DEVICE_H = 660;            // visible body height
const BEZEL = 11;                // outer bezel thickness
const OUTER_RADIUS = 52;
const INNER_RADIUS = 42;

// Resulting screen dimensions
const SCREEN_W = DEVICE_W - BEZEL * 2;
const SCREEN_H = DEVICE_H - BEZEL * 2;

export const IGSimulator: React.FC<Props> = ({ open, onClose, mode }) => {
  const formatNow = usePlacaStore((s) => s.format);
  const setFormat = usePlacaStore((s) => s.setFormat);
  const prevFormatRef = useRef<'story' | 'post'>(formatNow);

  useEffect(() => {
    if (!open) return;
    prevFormatRef.current = usePlacaStore.getState().format;
    setFormat(mode);
    return () => setFormat(prevFormatRef.current);
  }, [open, mode, setFormat]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} width={DEVICE_W + 96}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          padding: '36px 28px 28px',
          borderRadius: '0 0 8px 8px',
        }}
      >
        <IPhoneFrame>
          {mode === 'story' ? <StoryContent /> : <PostContent />}
        </IPhoneFrame>
        <div className="text-center text-[10px] text-neutral-500 mt-5 tracking-[2px] uppercase font-mono">
          {mode === 'story' ? '1080 × 1920 · Story' : '1080 × 1350 · Post'} · iPhone preview
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// iPhone frame with Dynamic Island, side buttons, realistic shadow
// ─────────────────────────────────────────────────────────────────────────────
const IPhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        width: DEVICE_W,
        height: DEVICE_H,
        margin: '0 auto',
        position: 'relative',
        background: 'linear-gradient(145deg, #2a2a2c 0%, #1a1a1c 50%, #2a2a2c 100%)',
        borderRadius: OUTER_RADIUS,
        padding: BEZEL,
        boxShadow:
          '0 0 0 1.5px #3a3a3c, 0 30px 70px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Side buttons */}
      <div style={{ position: 'absolute', left: -2, top: 110, width: 3, height: 32, background: '#1a1a1c', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: -2, top: 160, width: 3, height: 54, background: '#1a1a1c', borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: -2, top: 220, width: 3, height: 54, background: '#1a1a1c', borderRadius: 2 }} />
      <div style={{ position: 'absolute', right: -2, top: 160, width: 3, height: 82, background: '#1a1a1c', borderRadius: 2 }} />

      {/* Screen */}
      <div
        style={{
          width: SCREEN_W,
          height: SCREEN_H,
          background: '#000',
          borderRadius: INNER_RADIUS,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {children}

        {/* Dynamic Island */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 92,
            height: 26,
            background: '#000',
            borderRadius: 14,
            zIndex: 30,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04)',
          }}
        />

        {/* Status bar (clock + signal + wifi + battery) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 22px',
            zIndex: 25,
            pointerEvents: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          <span style={{ marginTop: 4 }}>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Home indicator bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 110,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.4)',
            zIndex: 30,
          }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STORY content (fills screen edge-to-edge, IG story chrome overlaid)
// ─────────────────────────────────────────────────────────────────────────────
const StoryContent: React.FC = () => {
  const [progress, setProgress] = useState(0.05);

  useEffect(() => {
    setProgress(0.05);
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 6000);
      setProgress(t);
      if (t >= 1) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, []);

  // Cover-fit: placa fills the whole iPhone screen edge-to-edge.
  // iPhone is ~9:19.5, story is 9:16, so we scale by the larger ratio to cover.
  const scale = Math.max(SCREEN_W / 1080, SCREEN_H / 1920);
  const placaW = 1080 * scale;
  const placaH = 1920 * scale;
  const offsetX = (SCREEN_W - placaW) / 2;
  const offsetY = (SCREEN_H - placaH) / 2;

  return (
    <>
      {/* Scaled placa, full-bleed under all UI chrome */}
      <div
        style={{
          position: 'absolute',
          top: offsetY,
          left: offsetX,
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <PlacaRenderer />
      </div>

      {/* Subtle top + bottom gradient so UI chrome reads well over any photo */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 130,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%)',
          zIndex: 15,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 90,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
          zIndex: 15,
          pointerEvents: 'none',
        }}
      />

      {/* Top chrome: progress bars + header (under Dynamic Island & status) */}
      <div style={{ position: 'absolute', top: 50, left: 10, right: 10, zIndex: 20 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.45)', borderRadius: 1, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: '#fff',
                transition: 'width 0.05s linear',
              }}
            />
          </div>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#fff' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#de1f1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Bebas Neue',
              fontSize: 16,
              fontWeight: 700,
              boxShadow: '0 0 0 1.5px #fff, 0 0 0 3px #de1f1a',
            }}
          >
            Z
          </div>
          <span style={{ fontSize: 11, fontWeight: 600 }}>zamboni.inmobiliaria</span>
          <span style={{ fontSize: 10, opacity: 0.75 }}>2 h</span>
          <span style={{ marginLeft: 'auto', fontSize: 14, lineHeight: 1 }}>⋯</span>
          <span style={{ fontSize: 13 }}>✕</span>
        </div>
      </div>

      {/* Bottom: reply bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 10,
          right: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '8px 14px',
            border: '1.5px solid rgba(255,255,255,0.55)',
            borderRadius: 22,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 11,
            background: 'rgba(0,0,0,0.18)',
            backdropFilter: 'blur(8px)',
          }}
        >
          Enviar mensaje
        </div>
        <Heart className="w-5 h-5 text-white" strokeWidth={2.2} />
        <Send className="w-5 h-5 text-white" strokeWidth={2.2} />
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POST content (IG feed: top bar + header + placa + actions + likes + caption)
// ─────────────────────────────────────────────────────────────────────────────
const PostContent: React.FC = () => {
  const data = usePlacaStore((s) => s.data);
  const scale = SCREEN_W / 1080;
  const placaH = 1350 * scale;

  return (
    <div style={{ width: SCREEN_W, height: SCREEN_H, background: '#000', color: '#fff', overflow: 'hidden' }}>
      {/* Spacer for status + Dynamic Island */}
      <div style={{ height: 50 }} />

      {/* IG top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 14px 8px',
        }}
      >
        <span style={{ fontFamily: '"Brush Script MT", cursive', fontSize: 22, color: '#fff', lineHeight: 1 }}>
          Instagram
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          <Heart className="w-5 h-5" strokeWidth={2} />
          <Send className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>

      {/* Post header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 9 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#de1f1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Bebas Neue',
            fontSize: 17,
            color: '#fff',
            boxShadow: '0 0 0 1.5px #fff, 0 0 0 3px #de1f1a',
          }}
        >
          Z
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600 }}>zamboni.inmobiliaria</div>
          <div style={{ fontSize: 9.5, opacity: 0.7 }}>{data.barrio || 'Buenos Aires'}</div>
        </div>
        <span style={{ fontSize: 16, opacity: 0.9 }}>⋯</span>
      </div>

      {/* Placa scaled into the post area */}
      <div style={{ width: SCREEN_W, height: placaH, overflow: 'hidden', position: 'relative', background: '#0a0a0a' }}>
        <div style={{ width: 1080, height: 1350, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <PlacaRenderer />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px 4px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <Heart className="w-6 h-6" strokeWidth={1.8} />
          <MessageCircle className="w-6 h-6" strokeWidth={1.8} />
          <Send className="w-6 h-6" strokeWidth={1.8} />
        </div>
        <Bookmark className="w-6 h-6" strokeWidth={1.8} />
      </div>

      <div style={{ padding: '2px 12px', fontSize: 12, fontWeight: 600 }}>247 Me gusta</div>
      <div style={{ padding: '4px 12px', fontSize: 12, lineHeight: 1.35 }}>
        <b>zamboni.inmobiliaria</b>{' '}
        <span style={{ opacity: 0.95 }}>
          {data.addr || ''}
          {data.barrio ? ' · ' + data.barrio : ''} — {priceString(data)}
        </span>
        <div style={{ color: '#737373', marginTop: 3, fontSize: 11 }}>Ver los 12 comentarios</div>
      </div>
    </div>
  );
};
