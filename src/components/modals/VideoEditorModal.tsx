import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { computeTimings, renderPreviewFrame, clearAssetCache, type PreviewSettings } from '@/lib/renderFrame';
import type { MediaItem, Transition, MotionStyle } from '@/lib/reel';
import { Play, Pause, Split, Copy, RotateCcw, Trash2, FastForward, Rewind, Gauge, Image as ImageIcon, Video } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  items: MediaItem[];
  setItems: (items: MediaItem[]) => void;
  posters: Record<string, string>;
  settings: PreviewSettings;
}

const TRANS: { id: Transition; label: string }[] = [
  { id: 'cut', label: 'Corte' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide-left', label: 'Slide ←' },
  { id: 'slide-up', label: 'Slide ↑' },
  { id: 'zoom-blur', label: 'Zoom blur' },
];

const MOTIONS: { id: MotionStyle; label: string }[] = [
  { id: 'zoom-in', label: 'Zoom in' },
  { id: 'zoom-out', label: 'Zoom out' },
  { id: 'pan-right', label: 'Pan →' },
  { id: 'pan-left', label: 'Pan ←' },
  { id: 'pan-up', label: 'Pan ↑' },
  { id: 'pan-down', label: 'Pan ↓' },
  { id: 'orbit-cw', label: 'Orbit ↻' },
  { id: 'orbit-ccw', label: 'Orbit ↺' },
  { id: 'static', label: 'Estático' },
];

const SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3];

export const VideoEditorModal: React.FC<Props> = ({ open, onClose, items, setItems, posters, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSec, setCurrentSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedClipIdx, setSelectedClipIdx] = useState<number | null>(null);
  const [selectedGapIdx, setSelectedGapIdx] = useState<number | null>(null); // gap BEFORE this clip
  const playStartRef = useRef<{ wallTime: number; videoTime: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const timings = useMemo(() => computeTimings(items, settings.globalDurationPerPhoto), [items, settings.globalDurationPerPhoto]);
  const totalSec = useMemo(() => timings.reduce((s, t) => s + t.durationSec, 0), [timings]);

  // Render frame whenever currentSec or items change
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await renderPreviewFrame(canvasRef.current!, items, settings, currentSec);
      } catch (e) { if (!cancelled) console.warn(e); }
    })();
    return () => { cancelled = true; };
  }, [open, currentSec, items, settings.format, settings.kenBurnsZoom, settings.colorGrade, settings.vignette, settings.cinematicLook, settings.transition, settings.transitionDuration]);

  // Playback loop
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      playStartRef.current = null;
      return;
    }
    playStartRef.current = { wallTime: performance.now(), videoTime: currentSec >= totalSec ? 0 : currentSec };
    if (currentSec >= totalSec) setCurrentSec(0);

    const tick = () => {
      if (!playStartRef.current) return;
      const elapsed = (performance.now() - playStartRef.current.wallTime) / 1000;
      const t = playStartRef.current.videoTime + elapsed;
      if (t >= totalSec) {
        setCurrentSec(totalSec);
        setPlaying(false);
        return;
      }
      setCurrentSec(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, totalSec]);

  // Cleanup asset cache when closing
  useEffect(() => { if (!open) clearAssetCache(); return () => { /* nothing on unmount */ }; }, [open]);

  if (!open) return null;

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s - m * 60).toFixed(1);
    return `${m}:${sec.padStart(4, '0')}`;
  };

  const updateClip = (idx: number, patch: Partial<MediaItem>) => {
    const next = items.map((it, i) => (i === idx ? ({ ...it, ...patch } as MediaItem) : it));
    setItems(next);
  };

  const setClipTransition = (idx: number, trans: Transition, duration: number) => {
    if (idx === 0) return; // no transition before first clip
    updateClip(idx, { transitionIn: { type: trans, duration } } as any);
  };

  const splitClipAtPlayhead = () => {
    if (selectedClipIdx == null) return;
    const idx = selectedClipIdx;
    const tim = timings[idx];
    const splitAt = currentSec - tim.startSec;
    if (splitAt <= 0.2 || splitAt >= tim.durationSec - 0.2) return;
    const item = items[idx];
    const cloneId = item.id + '_split_' + Date.now();
    let leftItem: MediaItem, rightItem: MediaItem;
    if (item.type === 'video') {
      const vd = item.videoDuration ?? 0;
      const ts = item.trimStart ?? 0;
      const te = item.trimEnd ?? vd;
      const speed = item.speed ?? 1;
      const splitVideoTime = ts + (splitAt * speed) * (te - ts) / Math.max(0.001, tim.durationSec);
      // ^ note: tim already factored speed; this is approximate but good for editor purposes
      leftItem = { ...item, trimEnd: splitVideoTime, duration: splitAt };
      rightItem = { ...item, id: cloneId, trimStart: splitVideoTime, duration: tim.durationSec - splitAt };
    } else {
      leftItem = { ...item, duration: splitAt };
      rightItem = { ...item, id: cloneId, duration: tim.durationSec - splitAt };
    }
    const next = [...items.slice(0, idx), leftItem, rightItem, ...items.slice(idx + 1)];
    setItems(next);
  };

  const duplicateClip = (idx: number) => {
    const item = items[idx];
    const dup = { ...item, id: item.id + '_dup_' + Date.now() } as MediaItem;
    setItems([...items.slice(0, idx + 1), dup, ...items.slice(idx + 1)]);
  };

  const deleteClip = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
    setSelectedClipIdx(null);
  };

  // ─── Timeline geometry ───────────────────────────────────────────────────
  const TIMELINE_PX_PER_SEC = 80; // base zoom; could be configurable
  const timelineWidth = Math.max(800, totalSec * TIMELINE_PX_PER_SEC);
  const playheadX = currentSec * TIMELINE_PX_PER_SEC;

  const timelineRef = useRef<HTMLDivElement>(null);
  const onTimelineMouseDown = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
    const newT = Math.max(0, Math.min(totalSec, x / TIMELINE_PX_PER_SEC));
    setCurrentSec(newT);
    setPlaying(false);
    // also try to figure out what was clicked
    const which = items.findIndex((_, i) => {
      const start = timings[i].startSec;
      const end = start + timings[i].durationSec;
      return newT >= start && newT <= end;
    });
    setSelectedClipIdx(which >= 0 ? which : null);
    setSelectedGapIdx(null);
  };

  const selectedClip = selectedClipIdx != null ? items[selectedClipIdx] : null;
  const selectedClipTiming = selectedClipIdx != null ? timings[selectedClipIdx] : null;

  return (
    <Modal open={open} onClose={onClose} title="Editor de video · Studio" width={1200}>
      <div className="flex flex-col h-[80vh]">
        {/* PREVIEW + INSPECTOR */}
        <div className="flex flex-1 min-h-0 border-b border-neutral-200">
          {/* Preview */}
          <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
            <canvas
              ref={canvasRef}
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                aspectRatio: settings.format === 'story' ? '9/16' : '4/5',
                background: '#000',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            />
            <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-white text-xs font-mono">
              <button
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center hover:bg-brand-600 transition"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span>{fmtTime(currentSec)}</span>
              <span className="opacity-50">/</span>
              <span>{fmtTime(totalSec)}</span>
            </div>
          </div>

          {/* Inspector */}
          <aside className="w-80 bg-white border-l border-neutral-200 overflow-y-auto p-3 space-y-3">
            {selectedGapIdx != null ? (
              <GapInspector
                idx={selectedGapIdx}
                items={items}
                onChange={(trans, dur) => setClipTransition(selectedGapIdx, trans, dur)}
                onClose={() => setSelectedGapIdx(null)}
              />
            ) : selectedClipIdx != null && selectedClip ? (
              <ClipInspector
                idx={selectedClipIdx}
                item={selectedClip}
                timing={selectedClipTiming!}
                onUpdate={(patch) => updateClip(selectedClipIdx, patch)}
                onSplit={splitClipAtPlayhead}
                onDuplicate={() => duplicateClip(selectedClipIdx)}
                onDelete={() => deleteClip(selectedClipIdx)}
              />
            ) : (
              <div className="text-center text-xs text-neutral-400 py-8">
                Hacé click en un clip de la timeline para editarlo.
              </div>
            )}
          </aside>
        </div>

        {/* TIMELINE */}
        <div className="bg-neutral-100 p-2 overflow-x-auto" ref={timelineRef} onMouseDown={onTimelineMouseDown}>
          <div style={{ width: timelineWidth, position: 'relative', height: 84 }}>
            {/* Time ruler */}
            <div className="absolute top-0 left-0 right-0 h-4 text-[9px] text-neutral-500 font-mono select-none pointer-events-none">
              {Array.from({ length: Math.ceil(totalSec) + 1 }).map((_, s) => (
                <div key={s} style={{ position: 'absolute', left: s * TIMELINE_PX_PER_SEC, top: 0 }}>
                  <span style={{ marginLeft: 2 }}>{s}s</span>
                </div>
              ))}
            </div>

            {/* Clips */}
            <div className="absolute left-0 right-0 top-5 h-16 flex">
              {items.map((item, i) => {
                const t = timings[i];
                const trans = item.transitionIn;
                const isSelected = i === selectedClipIdx;
                const poster = item.type === 'video' ? posters[item.id] : item.url;
                return (
                  <React.Fragment key={item.id}>
                    {i > 0 && (
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedGapIdx(i);
                          setSelectedClipIdx(null);
                        }}
                        style={{ width: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        className="text-neutral-400 hover:text-brand"
                        title={`Transición: ${trans?.type || settings.transition}`}
                      >
                        <span className="text-[8px] rotate-90 font-mono">{(trans?.type || settings.transition).slice(0, 4).toUpperCase()}</span>
                      </div>
                    )}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedClipIdx(i);
                        setSelectedGapIdx(null);
                      }}
                      style={{
                        width: t.durationSec * TIMELINE_PX_PER_SEC,
                        height: '100%',
                        background: poster ? `url("${poster}") center / cover` : 'linear-gradient(135deg, #555, #333)',
                        border: isSelected ? '2px solid #de1f1a' : '2px solid #d4d4d4',
                        borderRadius: 4,
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute bottom-1 left-1.5 text-white text-[9px] font-mono drop-shadow">
                        {item.type === 'video' ? <Video className="w-2.5 h-2.5 inline" /> : <ImageIcon className="w-2.5 h-2.5 inline" />}
                        {' '}{t.durationSec.toFixed(1)}s
                        {item.speed && item.speed !== 1 && <span className="ml-1">{item.speed}x</span>}
                        {item.reverse && <span className="ml-1">⏪</span>}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                left: playheadX,
                top: 0,
                bottom: 0,
                width: 2,
                background: '#de1f1a',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <div style={{ position: 'absolute', top: -2, left: -6, width: 14, height: 14, background: '#de1f1a', borderRadius: '50%' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-2.5 border-t border-neutral-200 bg-neutral-50 text-[11px] text-neutral-600">
          <div className="font-mono">
            {items.length} clips · {totalSec.toFixed(1)}s · click en clip para editar · click entre clips para cambiar transición
          </div>
          <button className="btn btn-primary" onClick={onClose}>Aplicar cambios</button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Inspectors ──────────────────────────────────────────────────────────────
const ClipInspector: React.FC<{
  idx: number;
  item: MediaItem;
  timing: { startSec: number; durationSec: number };
  onUpdate: (patch: Partial<MediaItem>) => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ idx, item, timing, onUpdate, onSplit, onDuplicate, onDelete }) => {
  const isVideo = item.type === 'video';
  const speed = item.speed ?? 1;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold">
        {isVideo ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
        <span>Clip #{idx + 1}</span>
        <span className="ml-auto text-neutral-400 font-mono text-[10px]">{timing.durationSec.toFixed(2)}s</span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-1.5">
        <button className="btn btn-ghost" onClick={onSplit} title="Cortar en el playhead">
          <Split className="w-3.5 h-3.5" /><span className="text-[10px]">Split</span>
        </button>
        <button className="btn btn-ghost" onClick={onDuplicate}>
          <Copy className="w-3.5 h-3.5" /><span className="text-[10px]">Duplicar</span>
        </button>
        <button className="btn btn-ghost text-brand" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" /><span className="text-[10px]">Borrar</span>
        </button>
      </div>

      {/* Duration */}
      <div>
        <label className="label">Duración · {timing.durationSec.toFixed(1)}s</label>
        <input
          type="range"
          min={0.5}
          max={isVideo && item.videoDuration ? Math.min(10, item.videoDuration) : 8}
          step={0.25}
          value={item.duration ?? timing.durationSec * (item.speed ?? 1)}
          onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) } as any)}
          className="w-full accent-brand"
        />
      </div>

      {/* Speed */}
      <div>
        <label className="label flex items-center gap-1"><Gauge className="w-3 h-3" /> Velocidad · {speed}x</label>
        <div className="grid grid-cols-6 gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onUpdate({ speed: s } as any)}
              className={`h-7 text-[10px] rounded border ${speed === s ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Reverse (video only) */}
      {isVideo && (
        <button
          onClick={() => onUpdate({ reverse: !(item as any).reverse } as any)}
          className={`btn w-full justify-center ${(item as any).reverse ? 'btn-primary' : ''}`}
        >
          <Rewind className="w-3.5 h-3.5" /> {(item as any).reverse ? 'Reverse activado' : 'Reverse'}
        </button>
      )}

      {/* Video trim */}
      {isVideo && item.videoDuration && (
        <div>
          <label className="label">Trim · {(item.trimStart ?? 0).toFixed(1)}s – {(item.trimEnd ?? item.videoDuration).toFixed(1)}s</label>
          <div className="grid grid-cols-2 gap-1">
            <input
              type="range"
              min={0}
              max={(item.trimEnd ?? item.videoDuration) - 0.5}
              step={0.1}
              value={item.trimStart ?? 0}
              onChange={(e) => onUpdate({ trimStart: parseFloat(e.target.value) } as any)}
              className="accent-brand"
            />
            <input
              type="range"
              min={(item.trimStart ?? 0) + 0.5}
              max={item.videoDuration}
              step={0.1}
              value={item.trimEnd ?? item.videoDuration}
              onChange={(e) => onUpdate({ trimEnd: parseFloat(e.target.value) } as any)}
              className="accent-brand"
            />
          </div>
        </div>
      )}

      {/* Motion */}
      <div>
        <label className="label">Motion</label>
        <select
          value={item.motion || 'auto'}
          onChange={(e) => onUpdate({ motion: e.target.value === 'auto' ? undefined : (e.target.value as MotionStyle) } as any)}
          className="select"
        >
          <option value="auto">Auto (alternado)</option>
          {MOTIONS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
        </select>
      </div>
    </div>
  );
};

const GapInspector: React.FC<{
  idx: number;
  items: MediaItem[];
  onChange: (trans: Transition, duration: number) => void;
  onClose: () => void;
}> = ({ idx, items, onChange, onClose }) => {
  const item = items[idx];
  const current = item.transitionIn || { type: 'fade' as Transition, duration: 0.5 };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold">
        <span>Transición</span>
        <span className="text-neutral-400 text-[10px]">entre clip #{idx} y #{idx + 1}</span>
        <button onClick={onClose} className="ml-auto text-neutral-400 hover:text-brand"><Trash2 className="w-3 h-3" /></button>
      </div>

      <div>
        <label className="label">Tipo</label>
        <div className="grid grid-cols-2 gap-1">
          {TRANS.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange(t.id, current.duration)}
              className={`h-8 text-[11px] rounded border ${current.type === t.id ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {current.type !== 'cut' && (
        <div>
          <label className="label">Duración · {current.duration.toFixed(2)}s</label>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.05}
            value={current.duration}
            onChange={(e) => onChange(current.type, parseFloat(e.target.value))}
            className="w-full accent-brand"
          />
        </div>
      )}

      <p className="text-[10px] text-neutral-400 leading-relaxed">
        Esta transición sobrescribe la global para este corte específico.
      </p>
    </div>
  );
};
