import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { PlacaRenderer } from '@/components/templates/Renderer';
import { priceString } from '@/lib/format';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'story' | 'post';
}

const STORY_W = 320;
const POST_W = 340;
const STORY_H = (STORY_W * 1920) / 1080;
const POST_PLACA_H = (POST_W * 1350) / 1080;

export const IGSimulator: React.FC<Props> = ({ open, onClose, mode }) => {
  const data = usePlacaStore((s) => s.data);
  const formatNow = usePlacaStore((s) => s.format);
  const setFormat = usePlacaStore((s) => s.setFormat);
  const photos = usePlacaStore((s) => s.photos);
  const [storyProgress, setStoryProgress] = useState(0.35);
  const prevFormatRef = useRef<'story' | 'post'>(formatNow);

  // Switch format to match mode when modal opens
  useEffect(() => {
    if (!open) return;
    prevFormatRef.current = usePlacaStore.getState().format;
    setFormat(mode);
    return () => {
      // restore previous format on close
      setFormat(prevFormatRef.current);
    };
  }, [open, mode, setFormat]);

  // story progress animation
  useEffect(() => {
    if (!open || mode !== 'story') return;
    setStoryProgress(0.05);
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 6000);
      setStoryProgress(t);
      if (t >= 1) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [open, mode]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} width={mode === 'story' ? 380 : 420}>
      <div className="bg-neutral-950 p-4 pt-3 rounded-b-lg">
        {mode === 'story' ? <StoryView width={STORY_W} progress={storyProgress} data={data} /> : <PostView width={POST_W} data={data} photos={photos} />}
        <div className="text-center text-[10px] text-neutral-500 mt-3 tracking-wider uppercase">
          {mode === 'story' ? '1080 × 1920' : '1080 × 1350'} · preview Instagram
        </div>
      </div>
    </Modal>
  );
};

const StoryView: React.FC<{ width: number; progress: number; data: any }> = ({ width, progress, data }) => {
  const scale = width / 1080;
  return (
    <div
      style={{
        width,
        height: width * (1920 / 1080),
        background: '#000',
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
        margin: '0 auto',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 8px #111',
      }}
    >
      {/* Scaled placa */}
      <div
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <PlacaRenderer />
      </div>

      {/* Top progress bar */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 5 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', background: '#fff', transition: 'width 0.05s linear' }} />
          </div>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
        </div>

        {/* Header */}
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
            }}
          >
            Z
          </div>
          <span style={{ fontSize: 12, fontWeight: 600 }}>zamboni.inmobiliaria</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>2 h</span>
          <span style={{ marginLeft: 'auto', fontSize: 16 }}>⋯</span>
          <span style={{ fontSize: 14 }}>✕</span>
        </div>
      </div>

      {/* Bottom reply bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 10,
          right: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 5,
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '9px 14px',
            border: '1.5px solid rgba(255,255,255,0.5)',
            borderRadius: 22,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 11,
          }}
        >
          Enviar mensaje
        </div>
        <Heart className="w-5 h-5 text-white" />
        <Send className="w-5 h-5 text-white" />
      </div>
    </div>
  );
};

const PostView: React.FC<{ width: number; data: any; photos: any[] }> = ({ width, data, photos }) => {
  const scale = width / 1080;
  return (
    <div
      style={{
        width,
        background: '#000',
        borderRadius: 28,
        overflow: 'hidden',
        margin: '0 auto',
        color: '#fff',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 8px #111',
      }}
    >
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px 4px', fontSize: 11, fontWeight: 600 }}>
        <span>9:41</span>
        <span>• 📶 🔋</span>
      </div>

      {/* IG top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 8px' }}>
        <span style={{ fontFamily: 'Italianno, "Brush Script MT", cursive', fontSize: 22, color: '#fff' }}>Instagram</span>
        <div style={{ display: 'flex', gap: 14, fontSize: 18 }}>
          <Heart className="w-5 h-5" />
          <Send className="w-5 h-5" />
        </div>
      </div>

      {/* Post header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 9 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#de1f1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Bebas Neue',
            fontSize: 18,
          }}
        >
          Z
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>zamboni.inmobiliaria</div>
          <div style={{ fontSize: 10, opacity: 0.7 }}>{data.barrio || 'Buenos Aires'}</div>
        </div>
        <span style={{ fontSize: 18 }}>⋯</span>
      </div>

      {/* Placa scaled */}
      <div style={{ width, height: width * (1350 / 1080), overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: 1080, height: 1350, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <PlacaRenderer />
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px 6px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <Heart className="w-6 h-6" />
          <MessageCircle className="w-6 h-6" />
          <Send className="w-6 h-6" />
        </div>
        <Bookmark className="w-6 h-6" />
      </div>

      <div style={{ padding: '0 12px', fontSize: 12, fontWeight: 600 }}>247 Me gusta</div>
      <div style={{ padding: '4px 12px 14px', fontSize: 12, lineHeight: 1.4 }}>
        <b>zamboni.inmobiliaria</b> {data.addr || ''}{data.barrio ? ' · ' + data.barrio : ''} — {priceString(data)}
        <div style={{ color: '#777', marginTop: 4, fontSize: 11 }}>Ver los 12 comentarios</div>
      </div>
    </div>
  );
};
