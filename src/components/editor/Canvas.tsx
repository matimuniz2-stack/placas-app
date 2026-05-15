import React, { useEffect, useRef, useState } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { PlacaRenderer } from '@/components/templates/Renderer';

const FORMAT_SIZES = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

export const Canvas = React.forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placaRef = useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => placaRef.current!);

  const format = usePlacaStore((s) => s.format);
  const selected = usePlacaStore((s) => s.selectedLayer);
  const select = usePlacaStore((s) => s.selectLayer);
  const patchLayer = usePlacaStore((s) => s.patchLayer);
  const sidebarLeftOpen = usePlacaStore((s) => s.sidebarLeftOpen);
  const sidebarRightOpen = usePlacaStore((s) => s.sidebarRightOpen);
  const showGrid = usePlacaStore((s) => s.showGrid);

  const [scale, setScale] = useState(0.3);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [moveableKey, setMoveableKey] = useState(0);

  const size = FORMAT_SIZES[format];

  // Fit-to-screen calc
  useEffect(() => {
    const fit = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 32;
      const aw = el.clientWidth - pad * 2;
      const ah = el.clientHeight - pad * 2;
      const s = Math.min(aw / size.w, ah / size.h);
      setScale(Math.max(0.05, s));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [size.w, size.h, sidebarLeftOpen, sidebarRightOpen, format]);

  // Update moveable target when selection changes
  useEffect(() => {
    if (!selected || !placaRef.current) {
      setTarget(null);
      return;
    }
    const el = placaRef.current.querySelector(`[data-layer="${selected}"]`) as HTMLElement;
    setTarget(el || null);
    setMoveableKey((k) => k + 1);
  }, [selected, format]);

  // Re-find target when other props change (template, data)
  const templateId = usePlacaStore((s) => s.templateId);
  const overrides = usePlacaStore((s) => s.layerOverrides);
  useEffect(() => {
    if (!selected || !placaRef.current) return;
    const t = setTimeout(() => {
      const el = placaRef.current!.querySelector(`[data-layer="${selected}"]`) as HTMLElement;
      if (el) {
        setTarget(el);
        setMoveableKey((k) => k + 1);
      }
    }, 30);
    return () => clearTimeout(t);
  }, [templateId, overrides, selected]);

  const handleDrag = (e: OnDrag) => {
    if (!selected || !placaRef.current) return;
    const layer = getEffectiveLayer(selected);
    if (!layer) return;
    const dx = (e.delta[0] / size.w) * 100;
    const dy = (e.delta[1] / size.h) * 100;
    patchLayer(selected, {
      x: Math.max(-50, Math.min(150, layer.x + dx)),
      y: Math.max(-50, Math.min(150, layer.y + dy)),
    });
  };

  const handleResize = (e: OnResize) => {
    if (!selected) return;
    const layer = getEffectiveLayer(selected);
    if (!layer) return;
    const newW = (e.width / size.w) * 100;
    const newH = (e.height / size.h) * 100;
    const patch: any = { w: newW };
    if (layer.h) patch.h = newH;
    patchLayer(selected, patch);
    e.target.style.width = `${e.width}px`;
    e.target.style.height = `${e.height}px`;
  };

  const handleRotate = (e: OnRotate) => {
    if (!selected) return;
    patchLayer(selected, { rotation: e.rotation });
  };

  return (
    <div
      ref={containerRef}
      className="canvas-area"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => select(null)}
    >
      <div
        style={{
          width: size.w,
          height: size.h,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          background: '#fff',
        }}
      >
        <div ref={placaRef} style={{ width: size.w, height: size.h, position: 'relative' }}>
          <PlacaRenderer />
          {showGrid && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 100,
                backgroundImage:
                  'linear-gradient(rgba(222,31,26,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(222,31,26,0.15) 1px, transparent 1px)',
                backgroundSize: `${size.w / 12}px ${size.w / 12}px`,
              }}
            />
          )}
        </div>

        {target && selected && (
          <Moveable
            key={moveableKey}
            target={target}
            draggable
            resizable
            rotatable={selected !== 'photo'}
            keepRatio={false}
            origin={false}
            zoom={1 / scale}
            throttleDrag={1}
            throttleResize={1}
            throttleRotate={1}
            onDrag={handleDrag}
            onResize={handleResize}
            onRotate={handleRotate}
          />
        )}
      </div>

      {/* Scale indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 11,
          color: '#737373',
          fontFamily: 'IBM Plex Mono, monospace',
          background: 'rgba(255,255,255,0.85)',
          padding: '4px 8px',
          borderRadius: 4,
          letterSpacing: 1,
        }}
      >
        {Math.round(scale * 100)}%  ·  {size.w}×{size.h}
      </div>
    </div>
  );
});
