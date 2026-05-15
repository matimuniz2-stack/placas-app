import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CropModal: React.FC<Props> = ({ open, onClose }) => {
  const format = usePlacaStore((s) => s.format);
  const photos = usePlacaStore((s) => s.photos);
  const activeIdx = usePlacaStore((s) => s.activePhotoIdx);
  const replacePhotoUrl = usePlacaStore((s) => s.replacePhotoUrl);
  const patchActivePhoto = usePlacaStore((s) => s.patchActivePhoto);
  const active = photos[activeIdx];

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 }); // px on screen
  const dragRef = useRef<{ on: boolean; mode: 'move' | 'resize'; sx: number; sy: number; r0: typeof rect }>({
    on: false,
    mode: 'move',
    sx: 0,
    sy: 0,
    r0: rect,
  });

  const aspect = format === 'story' ? 9 / 16 : 4 / 5;

  // Init the rect to a centered crop matching the aspect ratio
  const initRect = (w: number, h: number) => {
    let rw: number, rh: number;
    if (w / h > aspect) {
      rh = h * 0.92;
      rw = rh * aspect;
    } else {
      rw = w * 0.92;
      rh = rw / aspect;
    }
    setRect({
      x: (w - rw) / 2,
      y: (h - rh) / 2,
      w: rw,
      h: rh,
    });
  };

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setImgSize({ w: img.clientWidth, h: img.clientHeight });
    initRect(img.clientWidth, img.clientHeight);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.on) return;
      const { mode, sx, sy, r0 } = dragRef.current;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;

      if (mode === 'move') {
        const nx = Math.max(0, Math.min(imgSize.w - r0.w, r0.x + dx));
        const ny = Math.max(0, Math.min(imgSize.h - r0.h, r0.y + dy));
        setRect({ ...r0, x: nx, y: ny });
      } else {
        // resize from bottom-right, keep aspect
        const nw = Math.max(40, Math.min(imgSize.w - r0.x, r0.w + dx));
        const nh = nw / aspect;
        const finalH = Math.min(nh, imgSize.h - r0.y);
        const finalW = finalH * aspect;
        setRect({ ...r0, w: finalW, h: finalH });
      }
    };
    const onUp = () => {
      dragRef.current.on = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [imgSize, aspect]);

  const startMove = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { on: true, mode: 'move', sx: e.clientX, sy: e.clientY, r0: rect };
  };
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { on: true, mode: 'resize', sx: e.clientX, sy: e.clientY, r0: rect };
  };

  const handleApply = async () => {
    if (!active || !imgRef.current) return;
    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const sx = rect.x * scaleX;
    const sy = rect.y * scaleY;
    const sw = rect.w * scaleX;
    const sh = rect.h * scaleY;

    const src = new Image();
    src.crossOrigin = 'anonymous';
    src.src = active.url;
    await new Promise<void>((res, rej) => {
      if (src.complete) res();
      else {
        src.onload = () => res();
        src.onerror = () => rej(new Error('failed to load source'));
      }
    });

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    const newUrl = canvas.toDataURL('image/jpeg', 0.92);

    replacePhotoUrl(activeIdx, newUrl);
    patchActivePhoto({ pos: { x: 50, y: 50 }, zoom: 1 });
    onClose();
  };

  if (!active) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Recortar foto · ${format === 'story' ? '9:16' : '4:5'}`} width={760}>
      <div className="p-5">
        <div
          ref={stageRef}
          style={{
            position: 'relative',
            display: 'inline-block',
            maxWidth: '100%',
            background: '#000',
            userSelect: 'none',
            margin: '0 auto',
          }}
        >
          <img
            ref={imgRef}
            src={active.url}
            onLoad={onImgLoad}
            alt=""
            style={{ display: 'block', maxWidth: '100%', maxHeight: '60vh', pointerEvents: 'none' }}
          />

          {rect.w > 0 && (
            <div
              onMouseDown={startMove}
              style={{
                position: 'absolute',
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                border: '2px solid #de1f1a',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                cursor: 'move',
              }}
            >
              {/* Grid lines */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
              </div>
              {/* Resize handle (BR) */}
              <div
                onMouseDown={startResize}
                style={{
                  position: 'absolute',
                  right: -6,
                  bottom: -6,
                  width: 12,
                  height: 12,
                  background: '#de1f1a',
                  border: '2px solid #fff',
                  borderRadius: 2,
                  cursor: 'nwse-resize',
                }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 justify-end">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleApply}>Aplicar recorte</button>
        </div>
      </div>
    </Modal>
  );
};
