import React, { useEffect, useRef, useState } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate } from 'react-moveable';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { PlacaRenderer } from '@/components/templates/Renderer';
import { getTemplate } from '@/components/templates/registry';

const FORMAT_SIZES = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

// Capas de texto editables con doble click (deben coincidir con DATA_LAYERS del Renderer)
const EDITABLE = new Set(['addr', 'barrio', 'price', 'amen', 'op', 'desc', 'extras', 'tag', 'lbl', 'num']);
// Bloques de texto del Meta Ad (t19) editables in-canvas con doble click.
const META_TEXT_EDITABLE = new Set(['maHead', 'maSub', 'maTag']);

export const Canvas = React.forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placaRef = useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => placaRef.current!);

  const format = usePlacaStore((s) => s.format);
  const selected = usePlacaStore((s) => s.selectedLayer);
  const select = usePlacaStore((s) => s.selectLayer);
  const patchLayer = usePlacaStore((s) => s.patchLayer);
  const patchActivePhoto = usePlacaStore((s) => s.patchActivePhoto);
  const patchPhoto = usePlacaStore((s) => s.patchPhoto);
  const sidebarLeftOpen = usePlacaStore((s) => s.sidebarLeftOpen);
  const sidebarRightOpen = usePlacaStore((s) => s.sidebarRightOpen);
  const showGrid = usePlacaStore((s) => s.showGrid);
  const templateId = usePlacaStore((s) => s.templateId);
  const overrides = usePlacaStore((s) => s.layerOverrides);
  const editingLayer = usePlacaStore((s) => s.editingLayer);
  const setEditingLayer = usePlacaStore((s) => s.setEditingLayer);
  const customElements = usePlacaStore((s) => s.customElements);

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

  // Doble click sobre un texto → editar in-canvas. Se escucha en document porque
  // cuando la capa está seleccionada, el overlay de react-moveable tapa al texto
  // y el onDoubleClick del propio layer no llega.
  useEffect(() => {
    const onDbl = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;
      let lid: string | null = null;
      const layerEl = el.closest('[data-layer]') as HTMLElement | null;
      if (layerEl) lid = layerEl.getAttribute('data-layer');
      // si cayó sobre el recuadro de moveable, usar la capa seleccionada
      if (!lid && el.closest('.moveable-control-box')) lid = selected;
      if (!lid) return;
      // Meta Ad: bloques de texto fijos + elementos custom de tipo texto.
      const st = usePlacaStore.getState();
      // La línea de detalles con íconos (Zamboni Pro) no se edita in-canvas.
      if (lid === 'amen' && ['t16', 't25'].includes(st.templateId) && !(st.data.amenText && st.data.amenText.trim())) return;
      // Ídem la ubicación con pin dibujado (se edita desde el campo Barrio).
      if (lid === 'barrio' && ['t16', 't17', 't18', 't25'].includes(st.templateId) && st.textOverrides['barrio'] === undefined) return;
      // t25: las burbujas de destacados y el box de entrega se editan desde el
      // panel de datos; editarlos in-canvas los rompía a texto plano.
      if ((lid === 'extras' || lid === 'desc') && st.templateId === 't25') return;
      const isMetaText =
        META_TEXT_EDITABLE.has(lid) ||
        (/^maC\d$/.test(lid) && st.customElements[lid]?.type === 'text');
      if (lid !== 'photo' && (EDITABLE.has(lid) || isMetaText)) {
        e.preventDefault();
        select(lid as any);
        setEditingLayer(lid as any);
      }
    };
    document.addEventListener('dblclick', onDbl);
    return () => document.removeEventListener('dblclick', onDbl);
  }, [selected, select, setEditingLayer]);

  // Photo is fullbleed (no defaultLayers.photo in template) — drag pans the photo instead of layer
  const tpl = getTemplate(templateId);
  const photoIsFullbleed = !tpl.defaultLayers.photo;
  const photoIsSelectedFullbleed = selected === 'photo' && photoIsFullbleed;

  // ===== Selección múltiple: recuadro (marquee) + mover en grupo =====
  // Arrastrar en el gris alrededor de la placa (o Shift+arrastrar en cualquier
  // lado) dibuja un recuadro; las capas que toca quedan seleccionadas juntas.
  const [multiSel, setMultiSel] = useState<HTMLElement[]>([]);
  const [marquee, setMarquee] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const marqueeRef = useRef({ on: false, x0: 0, y0: 0 });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const mv = (e: MouseEvent) => {
      if (!marqueeRef.current.on) return;
      const { x0, y0 } = marqueeRef.current;
      setMarquee({ x: Math.min(x0, e.clientX), y: Math.min(y0, e.clientY), w: Math.abs(e.clientX - x0), h: Math.abs(e.clientY - y0) });
    };
    const up = (e: MouseEvent) => {
      if (!marqueeRef.current.on) return;
      marqueeRef.current.on = false;
      setMarquee(null);
      const { x0, y0 } = marqueeRef.current;
      const rect = {
        left: Math.min(x0, e.clientX),
        top: Math.min(y0, e.clientY),
        right: Math.max(x0, e.clientX),
        bottom: Math.max(y0, e.clientY),
      };
      if (rect.right - rect.left < 8 && rect.bottom - rect.top < 8) return; // fue un click, no un recuadro
      const root = placaRef.current;
      if (!root) return;
      const hits = (Array.from(root.querySelectorAll('[data-layer]')) as HTMLElement[]).filter((el) => {
        const id = el.getAttribute('data-layer');
        if (id === 'photo' && photoIsFullbleed) return false; // el fondo no entra al grupo
        const r = el.getBoundingClientRect();
        return r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top;
      });
      // El click fantasma que dispara el navegador al soltar no debe tocar la selección.
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 150);
      if (hits.length >= 2) { select(null); setMultiSel(hits); }
      else if (hits.length === 1) { setMultiSel([]); select(hits[0].getAttribute('data-layer') as any); }
      else setMultiSel([]);
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [photoIsFullbleed, select]);

  // Suprimir el click posterior al marquee (fase captura, antes que cualquier handler).
  useEffect(() => {
    const cap = (e: MouseEvent) => {
      if (suppressClickRef.current) { e.stopPropagation(); e.preventDefault(); }
    };
    document.addEventListener('click', cap, true);
    return () => document.removeEventListener('click', cap, true);
  }, []);

  // Salir del grupo: Escape, seleccionar una capa suelta, o cambiar template/formato.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMultiSel([]); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (selected) setMultiSel([]); }, [selected]);
  useEffect(() => { setMultiSel([]); }, [templateId, format]);

  const startMarquee = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('.moveable-control-box')) return;
    const insidePlaca = !!t.closest('[data-placa-root]');
    if (insidePlaca && !e.shiftKey) return; // sobre la placa, solo con Shift
    marqueeRef.current = { on: true, x0: e.clientX, y0: e.clientY };
    setMarquee({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    e.preventDefault();
  };

  // Dado el id de una capa, devuelve el índice de foto al que está vinculada si esa
  // capa es un "placeholder de foto" (foto contenida, celda de galería, fotos del
  // Meta Ad o un elemento custom de tipo foto). Devuelve null si no es de foto.
  // Permite tratar TODOS los placeholders igual: arrastrar encuadra la imagen, y
  // Alt/Cmd + arrastrar mueve el placeholder.
  const photoSlotIdx = (id: string | null): number | null => {
    if (!id) return null;
    const st = usePlacaStore.getState();
    if (id === 'photo') return st.activePhotoIdx;
    if (/^g\d$/.test(id)) return st.galleryCells[id] ?? parseInt(id.slice(1), 10) + 1;
    if (id === 'maPhoto1') return st.galleryCells['maPhoto1'] ?? 0;
    if (id === 'maPhoto2') return st.galleryCells['maPhoto2'] ?? 1;
    if (id === 'maPhoto3') return st.galleryCells['maPhoto3'] ?? 2;
    if (/^maC\d$/.test(id) && st.customElements[id]?.type === 'photo')
      return st.galleryCells[id] ?? st.customElements[id]?.photoIdx ?? 0;
    return null;
  };

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
    // Shift+arrastrar = marquee de selección múltiple (no panear la foto)
    if (e.shiftKey) return;
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
    const st = usePlacaStore.getState();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    // Placeholder de foto seleccionado (galería, Meta Ad, foto contenida o
    // fullbleed): scroll = zoom de ESA foto.
    const slotIdx = photoSlotIdx(selected);
    if (selected && slotIdx != null) {
      const p = st.photos[slotIdx];
      if (!p) return;
      e.preventDefault();
      patchPhoto(slotIdx, { zoom: Math.max(1, Math.min(3, p.zoom + delta)) });
      return;
    }
    // Otra capa seleccionada (no foto): no hacemos zoom.
    if (selected) return;
    // Nada seleccionado: zoom de la foto activa (fondo).
    const active = st.photos[st.activePhotoIdx];
    if (!active) return;
    e.preventDefault();
    patchActivePhoto({ zoom: Math.max(1, Math.min(3, active.zoom + delta)) });
  };

  // react-moveable callbacks
  const handleDrag = (e: OnDrag) => {
    if (!selected) return;

    // Placeholder de foto (foto contenida, celda de galería, fotos del Meta Ad o
    // elemento custom de tipo foto): arrastrar ENCUADRA la imagen dentro de su caja;
    // con Alt/Cmd + arrastrar se MUEVE la caja. Caja vacía: siempre mueve la caja.
    const slotIdx = photoSlotIdx(selected);
    if (slotIdx != null) {
      const ie = e.inputEvent as any;
      const moveBox = !!(ie && (ie.altKey || ie.metaKey));
      const active = usePlacaStore.getState().photos[slotIdx];
      const layer = getEffectiveLayer(selected);
      if (!moveBox && active && layer) {
        const boxW = size.w * ((layer.w || 100) / 100);
        const boxH = size.h * ((layer.h || 100) / 100);
        const dx = (e.delta[0] / boxW) * 100;
        const dy = (e.delta[1] / boxH) * 100;
        patchPhoto(slotIdx, {
          pos: {
            x: Math.max(0, Math.min(100, active.pos.x - dx)),
            y: Math.max(0, Math.min(100, active.pos.y - dy)),
          },
        });
        moveableRef.current?.updateRect();
        return;
      }
      // moveBox o caja vacía → cae al movimiento de la caja (abajo).
    }

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
    // Capas de burbujas (destacados / box de entrega): agrandar la caja escala
    // el texto proporcionalmente, así las pills crecen enteras (estilo Canva).
    if ((selected === 'extras' || selected === 'desc') && layer.w && layer.size) {
      patch.size = Math.max(12, Math.round(layer.size * (newW / layer.w)));
    }
    patchLayer(selected, patch);
    e.target.style.width = `${e.width}px`;
    if (layer.h) e.target.style.height = `${e.height}px`;
  };

  const handleRotate = (e: OnRotate) => {
    if (!selected) return;
    patchLayer(selected, { rotation: e.rotation });
  };

  const photos = usePlacaStore((s) => s.photos);
  const galleryCells = usePlacaStore((s) => s.galleryCells);
  const hasPhoto = photos.length > 0;
  // Placeholder de foto seleccionado (cualquier template): se puede encuadrar la
  // imagen dentro y mover el placeholder con Alt. `photo` fullbleed se encuadra con
  // el cursor de fondo (no por moveable).
  const selectedSlotIdx = selected ? photoSlotIdx(selected) : null;
  const selectedSlotHasPhoto = selectedSlotIdx != null && !!photos[selectedSlotIdx];
  const photoBoxSelected = selected != null && selected !== 'photo' && selectedSlotHasPhoto;
  const showPhotoCursor = hasPhoto && (!selected || photoIsSelectedFullbleed);
  const canFramePhoto = hasPhoto && (showPhotoCursor || selectedSlotHasPhoto);
  const useMoveable = !!target && !!selected && !photoIsSelectedFullbleed && !editingLayer;

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
        if (e.target === e.currentTarget) { select(null); setMultiSel([]); }
      }}
      onMouseDown={startMarquee}
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

        {/* Grupo: mover varias capas juntas (seleccionadas con el marquee) */}
        {multiSel.length >= 2 && (
          <Moveable
            key={`group-${moveableKey}-${multiSel.length}`}
            target={multiSel}
            draggable
            origin={false}
            zoom={1 / scale}
            throttleDrag={1}
            onDragGroup={(e: any) => {
              for (const ev of e.events) {
                const id = ev.target.getAttribute('data-layer');
                if (!id) continue;
                const layer = getEffectiveLayer(id as any);
                if (!layer) continue;
                const dx = (ev.delta[0] / size.w) * 100;
                const dy = (ev.delta[1] / size.h) * 100;
                patchLayer(id as any, { x: layer.x + dx, y: layer.y + dy });
              }
            }}
            snappable
            verticalGuidelines={[0, size.w / 2, size.w]}
            horizontalGuidelines={[0, size.h / 2, size.h]}
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
        {multiSel.length >= 2 ? (
          <span className="ml-2 text-brand">· {multiSel.length} capas: arrastrá para moverlas juntas · Esc para salir</span>
        ) : (
          <>
            {canFramePhoto && <span className="ml-2 text-brand">· {photoBoxSelected ? 'arrastrá: encuadrar foto · Alt+arrastrá: mover · scroll: zoom · handles: tamaño' : 'drag/scroll para encuadrar'}</span>}
            <span className="ml-2">· shift+arrastrá: seleccionar varias</span>
          </>
        )}
      </div>

      {/* Recuadro del marquee */}
      {marquee && (
        <div
          style={{
            position: 'fixed',
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
            border: '1.5px dashed #de1f1a',
            background: 'rgba(222,31,26,0.06)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});
