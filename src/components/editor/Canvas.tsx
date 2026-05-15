import React, { useEffect, useRef, useState } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { PlacaRenderer } from '@/components/templates/Renderer';
import { getTemplate } from '@/components/templates/registry';

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
  const patchActivePhoto = usePlacaStore((s) => s.patchActivePhoto);
  const sidebarLeftOpen = usePlacaStore((s) => s.sidebarLeftOpen);
  const sidebarRightOpen = usePlacaStore((s) => s.sidebarRightOpen);
  const showGrid = usePlacaStore((s) => s.showGrid);
  const templateId = usePlacaStore((s) => s.templateId);
  const overrides = usePlacaStore((s) => s.layerOverrides);

  const [scale, setScale] = useState(0.3);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [moveableKey, setMoveableKey] = useState(0);
  const [elementGuidelines, setElementGuidelines] = useState<HTMLElement[]>([]);
  const moveableRef = useRef<Moveable | null>(null);

  const size = FORMAT_SIZES[format];

  // Fit-to-screen calc
  useEffect(() => {
    const fit = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 24;
      const aw = el.clientWidth - pad * 2;
      const ah = el.clientHeight - pad * 2;
      const s = Math.min(aw / size.w, ah / size.h);
      setScale(Math.max(0.05, s));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [size.w, size.h, format]);

  // Re-fit + re-key moveable when sidebars toggle
  useEffect(() => {
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (el) {
        const pad = 24;
        const aw = el.clientWidth - pad * 2;
        const ah = el.clientHeight - pad * 2;
        setScale(Math.max(0.05, Math.min(aw / size.w, ah / size.h)));
      }
      setMoveableKey((k) => k + 1);
    }, 350); // wait for sidebar transition
    return () => clearTimeout(t);
  }, [sidebarLeftOpen, sidebarRightOpen]);

  // Resolve target whenever selected/template/overrides change. Also collect
  // all other layers as snap guidelines so dragging shows alignment lines.
  useEffect(() => {
    if (!selected || !placaRef.current) {
      setTarget(null);
      setElementGuidelines([]);
      return;
    }
    const findTarget = () => {
      const root = placaRef.current!;
      const el = root.querySelector(`[data-layer="${selected}"]`) as HTMLElement;
      if (el && el !== target) {
        setTarget(el);
        setMoveableKey((k) => k + 1);
      } else if (el && el === target) {
        moveableRef.current?.updateRect();
      }
      // Build guideline list: every other visible layer
      const all = Array.from(root.querySelectorAll('[data-layer]')) as HTMLElement[];
      setElementGuidelines(all.filter((n) => n !== el));
    };
    findTarget();
    const t = setTimeout(findTarget, 50);
    return () => clearTimeout(t);
  }, [selected, templateId, overrides, format]);

  // Photo is fullbleed (no defaultLayers.photo in template) — drag pans the photo instead of layer
  const tpl = getTemplate(templateId);
  const photoIsFullbleed = !tpl.defaultLayers.photo;
  const photoIsSelectedFullbleed = selected === 'photo' && photoIsFullbleed;

  // Photo pan/zoom handlers
  const photoDragRef = useRef({ on: false, x: 0, y: 0, posX: 50, posY: 50 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!photoDragRef.current.on || !placaRef.current) return;
      const rect = placaRef.current.getBoundingClientRect();
      const dx = ((e.clientX - photoDragRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - photoDragRef.current.y) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, photoDragRef.current.posX - dx));
      const newY = Math.max(0, Math.min(100, photoDragRef.current.posY - dy));
      patchActivePhoto({ pos: { x: newX, y: newY } });
    };
    const onUp = () => {
      photoDragRef.current.on = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [patchActivePhoto]);

  const handlePlacaMouseDown = (e: React.MouseEvent) => {
    // Only when no layer is selected OR the photo is the "fullbleed" selection
    if (selected && !photoIsSelectedFullbleed) return;
    const photos = usePlacaStore.getState().photos;
    const active = photos[usePlacaStore.getState().activePhotoIdx];
    if (!active) return;
    photoDragRef.current = {
      on: true,
      x: e.clientX,
      y: e.clientY,
      posX: active.pos.x,
      posY: active.pos.y,
    };
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleWheel = (e: React.WheelEvent) => {
    const photos = usePlacaStore.getState().photos;
    const active = photos[usePlacaStore.getState().activePhotoIdx];
    if (!active) return;
    if (selected && !photoIsSelectedFullbleed) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.max(1, Math.min(3, active.zoom + delta));
    patchActivePhoto({ zoom: newZoom });
  };

  // react-moveable callbacks
  const handleDrag = (e: OnDrag) => {
    if (!selected) return;
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

  const photos = usePlacaStore((s) => s.photos);
  const hasPhoto = photos.length > 0;
  const showPhotoCursor = hasPhoto && (!selected || photoIsSelectedFullbleed);
  const useMoveable = !!target && !!selected && !photoIsSelectedFullbleed;

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
      onClick={(e) => {
        // Click on empty canvas area deselects
        if (e.target === e.currentTarget) select(null);
      }}
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
          cursor: showPhotoCursor ? (photoDragRef.current.on ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={handlePlacaMouseDown}
        onWheel={handleWheel}
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

        {useMoveable && (
          <Moveable
            key={moveableKey}
            ref={moveableRef as any}
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
            /* Smart snap guides (Figma-style) */
            snappable
            snapDirections={{ top: true, right: true, bottom: true, left: true, center: true, middle: true }}
            elementSnapDirections={{ top: true, right: true, bottom: true, left: true, center: true, middle: true }}
            snapThreshold={6}
            snapGridWidth={0}
            snapGridHeight={0}
            elementGuidelines={elementGuidelines}
            verticalGuidelines={[0, size.w / 2, size.w]}
            horizontalGuidelines={[0, size.h / 2, size.h]}
            isDisplaySnapDigit
            isDisplayInnerSnapDigit
            snapGap
            snapDistFormat={(v: number) => `${Math.round(v)}px`}
          />
        )}
      </div>

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
        {showPhotoCursor && hasPhoto && <span className="ml-2 text-brand">· drag/scroll para encuadrar</span>}
      </div>
    </div>
  );
});
