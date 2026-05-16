import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import {
  generateReel,
  isReelSupported,
  PRESETS,
  probeVideo,
  captureVideoPoster,
  type Transition,
  type Preset,
  type MediaItem,
} from '@/lib/reel';
import { downloadBlob } from '@/lib/export';
import { slugify } from '@/lib/format';
import { Film, Download, Play, Sparkles, Zap, Minus, Crown, Flame, Palette } from 'lucide-react';
import { ReelTimeline } from './ReelTimeline';
import type { ColorGrade, EffectsLevel, TextStyle } from '@/lib/reel';

interface Props {
  open: boolean;
  onClose: () => void;
  placaRef: React.RefObject<HTMLDivElement>;
}

const PRESET_META: Record<Preset, { label: string; icon: any; desc: string; accent: string }> = {
  cinematic: { label: 'Cinemático',  icon: Sparkles, desc: 'Slow + teal grade + grain',  accent: 'bg-purple-50 border-purple-300 text-purple-700' },
  energetic: { label: 'Energético',  icon: Zap,      desc: 'Rápido + punch + RGB split', accent: 'bg-orange-50 border-orange-300 text-orange-700' },
  viral:     { label: 'Viral',       icon: Flame,    desc: 'Speed ramp + cuts + glitch', accent: 'bg-pink-50 border-pink-300 text-pink-700' },
  minimal:   { label: 'Minimal',     icon: Minus,    desc: 'Sin efectos',                accent: 'bg-neutral-50 border-neutral-300 text-neutral-700' },
  pro:       { label: 'Pro Studio',  icon: Crown,    desc: 'HD 2K + gold + outro',       accent: 'bg-brand/10 border-brand text-brand' },
};

const COLOR_GRADES: { id: ColorGrade; label: string; preview: string }[] = [
  { id: 'none',            label: 'Original',      preview: 'linear-gradient(135deg,#7a7a7a,#3a3a3a)' },
  { id: 'cinematic-teal',  label: 'Cinema Teal',   preview: 'linear-gradient(135deg,#1d5e6e,#ff9a55)' },
  { id: 'warm-sunset',     label: 'Warm Sunset',   preview: 'linear-gradient(135deg,#ff7e3d,#ffd5a8)' },
  { id: 'cold-blue',       label: 'Cold Blue',     preview: 'linear-gradient(135deg,#1c3a7a,#6a8dd5)' },
  { id: 'vintage-film',    label: 'Vintage Film',  preview: 'linear-gradient(135deg,#b8825d,#f3d8a8)' },
  { id: 'punchy-estate',   label: 'Punchy',        preview: 'linear-gradient(135deg,#0a0a0a,#ffffff)' },
  { id: 'premium-gold',    label: 'Premium Gold',  preview: 'linear-gradient(135deg,#1c1715,#c9a86b)' },
];

const TEXT_STYLES: { id: TextStyle; label: string }[] = [
  { id: 'off',     label: 'Off' },
  { id: 'bold',    label: 'Bold' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'minimal', label: 'Minimal' },
];

const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: 'cut',        label: 'Corte' },
  { id: 'fade',       label: 'Fade' },
  { id: 'slide-left', label: 'Slide ←' },
  { id: 'slide-up',   label: 'Slide ↑' },
  { id: 'zoom-blur',  label: 'Zoom blur' },
];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });

export const ReelModal: React.FC<Props> = ({ open, onClose, placaRef }) => {
  const photos = usePlacaStore((s) => s.photos);
  const format = usePlacaStore((s) => s.format);
  const data = usePlacaStore((s) => s.data);

  // Timeline state
  const [items, setItems] = useState<MediaItem[]>([]);
  const [posters, setPosters] = useState<Record<string, string>>({});
  const [videoMeta, setVideoMeta] = useState<Record<string, { duration: number; w: number; h: number }>>({});

  // Settings
  const [content, setContent] = useState<'photos' | 'placa'>('photos');
  const [preset, setPreset] = useState<Preset>('cinematic');
  const [duration, setDuration] = useState(4);
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [zoom, setZoom] = useState(14);
  const [transition, setTransition] = useState<Transition>('fade');
  const [vignette, setVignette] = useState(true);
  const [cinematicLook, setCinematicLook] = useState(true);
  const [hd, setHd] = useState(true);
  const [intro, setIntro] = useState(true);
  const [outro, setOutro] = useState(true);

  // Effects pack
  const [effectsLevel, setEffectsLevel] = useState<EffectsLevel>('cinematic');
  const [colorGrade, setColorGrade] = useState<ColorGrade>('cinematic-teal');
  const [speedRamp, setSpeedRamp] = useState(false);
  const [zoomPunch, setZoomPunch] = useState(true);
  const [lightLeak, setLightLeak] = useState(true);
  const [filmGrain, setFilmGrain] = useState(true);
  const [rgbSplit, setRgbSplit] = useState(false);
  const [glitchFlash, setGlitchFlash] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextStyle>('elegant');

  // Run state
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'capturing' | 'encoding'>('idle');
  const [progress, setProgress] = useState({ cur: 0, total: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef(false);

  // Initialize items from store photos on open
  useEffect(() => {
    if (open && items.length === 0 && photos.length > 0) {
      setItems(photos.map((p, i) => ({ id: 'p' + i + '_' + Date.now(), type: 'photo' as const, url: p.url })));
    }
  }, [open, photos]);

  useEffect(() => {
    if (!open) {
      abortRef.current = false;
      setBusy(false);
      setPhase('idle');
      setProgress({ cur: 0, total: 0 });
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      setResultBlob(null);
      setElapsed(0);
    }
  }, [open]);

  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    return () => clearInterval(id);
  }, [busy]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const cfg = PRESETS[p];
    if (cfg.durationPerPhoto !== undefined) setDuration(cfg.durationPerPhoto);
    if (cfg.fps !== undefined) setFps(cfg.fps as any);
    if (cfg.kenBurnsZoom !== undefined) setZoom(Math.round((cfg.kenBurnsZoom - 1) * 100));
    if (cfg.transition !== undefined) setTransition(cfg.transition);
    if (cfg.vignette !== undefined) setVignette(cfg.vignette);
    if (cfg.cinematicLook !== undefined) setCinematicLook(cfg.cinematicLook);
    if (cfg.hd !== undefined) setHd(cfg.hd);
    if (cfg.intro !== undefined) setIntro(cfg.intro);
    if (cfg.outro !== undefined) setOutro(cfg.outro);
    if (cfg.effectsLevel !== undefined) setEffectsLevel(cfg.effectsLevel);
    if (cfg.colorGrade !== undefined) setColorGrade(cfg.colorGrade);
    if (cfg.speedRamp !== undefined) setSpeedRamp(cfg.speedRamp);
    if (cfg.zoomPunch !== undefined) setZoomPunch(cfg.zoomPunch);
    if (cfg.lightLeak !== undefined) setLightLeak(cfg.lightLeak);
    if (cfg.filmGrain !== undefined) setFilmGrain(cfg.filmGrain);
    if (cfg.rgbSplit !== undefined) setRgbSplit(cfg.rgbSplit);
    if (cfg.glitchFlash !== undefined) setGlitchFlash(cfg.glitchFlash);
    if (cfg.textOverlays !== undefined) setTextOverlays(cfg.textOverlays);
  };

  const handleAddPhotos = async (files: FileList) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    const dataUrls = await Promise.all(arr.map(fileToDataUrl));
    const newItems: MediaItem[] = dataUrls.map((url, i) => ({
      id: 'pf' + Date.now() + '_' + i,
      type: 'photo' as const,
      url,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleAddVideos = async (files: FileList) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (!arr.length) return;
    for (const f of arr) {
      const url = URL.createObjectURL(f);
      try {
        const meta = await probeVideo(url);
        const id = 'vid' + Date.now() + '_' + Math.floor(Math.random() * 9999);
        const poster = await captureVideoPoster(url, 0.1).catch(() => '');
        setItems((prev) => [
          ...prev,
          {
            id,
            type: 'video',
            url,
            videoDuration: meta.duration,
            videoWidth: meta.width,
            videoHeight: meta.height,
            trimStart: 0,
            trimEnd: Math.min(meta.duration, 10),
          },
        ]);
        setVideoMeta((prev) => ({ ...prev, [id]: { duration: meta.duration, w: meta.width, h: meta.height } }));
        if (poster) setPosters((prev) => ({ ...prev, [id]: poster }));
      } catch (e: any) {
        alert('No se pudo cargar el video: ' + (e?.message || e));
        URL.revokeObjectURL(url);
      }
    }
  };

  const updateItem = (id: string, patch: Partial<MediaItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? ({ ...it, ...patch } as MediaItem) : it)));

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it && it.type === 'video' && it.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(it.url); } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
    setPosters((p) => { const n = { ...p }; delete n[id]; return n; });
    setVideoMeta((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  if (!open) return null;

  const supported = isReelSupported();

  // Compute total duration with per-item overrides
  const totalDuration =
    items.reduce((s, it) => {
      if (it.type === 'video') {
        const vd = videoMeta[it.id]?.duration ?? (it as any).videoDuration ?? 0;
        const ts = (it as any).trimStart ?? 0;
        const te = (it as any).trimEnd ?? vd;
        return s + (it.duration ?? Math.min(te - ts, duration));
      }
      return s + (it.duration ?? duration);
    }, 0) +
    (intro && content === 'photos' ? 1.2 : 0) +
    (outro ? 1.8 : 0);

  const handleGenerate = async () => {
    if (!placaRef.current) return;
    if (items.length === 0) { alert('Agregá al menos una foto o video.'); return; }
    abortRef.current = false;
    setBusy(true);
    setPhase('capturing');
    setProgress({ cur: 0, total: items.length });
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setResultBlob(null);
    try {
      const result = await generateReel({
        placaEl: placaRef.current,
        format,
        durationPerPhoto: duration,
        fps,
        kenBurnsZoom: 1 + zoom / 100,
        transition,
        transitionDuration: transition === 'cut' ? 0 : 0.55,
        content,
        vignette,
        cinematicLook,
        hd,
        intro: intro && content === 'photos',
        outro,
        items,
        bitrate: hd ? 14_000_000 : 10_000_000,
        effectsLevel,
        colorGrade,
        speedRamp,
        zoomPunch,
        lightLeak,
        filmGrain,
        rgbSplit,
        glitchFlash,
        textOverlays,
        textData: {
          addr: data.addr,
          barrio: data.barrio,
          price: data.price,
          currency: data.currency,
          amb: data.amb,
          m2: data.m2,
          baths: data.baths,
          op: data.op,
          handle: '@zamboni.inmobiliaria',
        },
        onProgress: (ph, cur, total) => { setPhase(ph as any); setProgress({ cur, total }); },
        onAbort: () => abortRef.current,
      });
      setResultBlob(result.blob);
      setPreviewUrl(URL.createObjectURL(result.blob));
      setPhase('idle');
    } catch (e: any) {
      if (!String(e?.message).includes('Cancelado')) alert('Error: ' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => { abortRef.current = true; };
  const handleDownload = () => {
    if (!resultBlob) return;
    const name = `zamboni_reel_${slugify(data.barrio || data.addr) || 'placa'}_${preset}_${format}.mp4`;
    downloadBlob(resultBlob, name);
  };

  const progressPct = progress.total > 0 ? Math.round((progress.cur / progress.total) * 100) : 0;
  const phaseLabel = phase === 'capturing' ? 'Cargando media' : phase === 'encoding' ? 'Encodeando H.264' : '';

  return (
    <Modal open={open} onClose={onClose} title="Reel MP4 · Studio" width={780}>
      <div className="p-5 space-y-4">
        {!supported && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-xs text-yellow-900">
            ⚠ Tu navegador no soporta WebCodecs. Usá Chrome o Edge actualizado.
          </div>
        )}

        {/* PRESETS */}
        <div>
          <label className="label">Preset</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(PRESET_META) as Preset[]).map((p) => {
              const meta = PRESET_META[p];
              const Icon = meta.icon;
              const active = preset === p;
              return (
                <button
                  key={p}
                  disabled={busy}
                  onClick={() => applyPreset(p)}
                  className={`p-2 rounded border text-left transition ${active ? meta.accent : 'bg-white border-neutral-200 hover:border-neutral-300'}`}
                >
                  <Icon className="w-3.5 h-3.5 mb-1" />
                  <div className="text-[11px] font-bold">{meta.label}</div>
                  <div className="text-[9px] opacity-70 leading-tight mt-0.5">{meta.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TIMELINE */}
        <ReelTimeline
          items={items}
          posters={posters}
          videoMeta={videoMeta}
          globalDuration={duration}
          disabled={busy}
          onReorder={setItems}
          onUpdate={updateItem}
          onRemove={removeItem}
          onAddPhotos={handleAddPhotos}
          onAddVideos={handleAddVideos}
        />

        {/* Content */}
        <div>
          <label className="label">Contenido</label>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => setContent('photos')} className={`p-2.5 rounded border-2 text-left text-xs transition ${content === 'photos' ? 'border-brand bg-brand/5' : 'border-neutral-200 hover:border-neutral-300'}`}>
              <b>Solo fotos/videos</b>
              <div className="text-[10px] text-neutral-500 leading-tight">Sin logo ni textos.</div>
            </button>
            <button disabled={busy} onClick={() => setContent('placa')} className={`p-2.5 rounded border-2 text-left text-xs transition ${content === 'placa' ? 'border-brand bg-brand/5' : 'border-neutral-200 hover:border-neutral-300'}`}>
              <b>Con placa</b>
              <div className="text-[10px] text-neutral-500 leading-tight">Branding completo (fotos del store).</div>
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1.5 leading-snug">
            💡 Generá el reel sin música → subilo a Instagram → poné audio desde la biblioteca de Reels.
          </p>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Por foto · {duration}s</label>
            <input type="range" min={1.5} max={6} step={0.5} value={duration} disabled={busy} onChange={(e) => setDuration(parseFloat(e.target.value))} className="w-full accent-brand" />
          </div>
          <div>
            <label className="label">FPS</label>
            <div className="grid grid-cols-3 gap-1">
              {[24, 30, 60].map((f) => (
                <button key={f} disabled={busy} onClick={() => setFps(f as any)} className={`h-7 text-[11px] rounded border ${fps === f ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Ken Burns · {zoom}%</label>
            <input type="range" min={0} max={35} value={zoom} disabled={busy} onChange={(e) => setZoom(parseInt(e.target.value))} className="w-full accent-brand" />
          </div>
        </div>

        <div>
          <label className="label">Transición</label>
          <div className="grid grid-cols-5 gap-1">
            {TRANSITIONS.map((t) => (
              <button key={t.id} disabled={busy} onClick={() => setTransition(t.id)} className={`h-8 text-[10.5px] rounded border ${transition === t.id ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <Toggle label="Vignette" active={vignette} onClick={() => setVignette(!vignette)} disabled={busy} />
          <Toggle label="Cinematic" active={cinematicLook} onClick={() => setCinematicLook(!cinematicLook)} disabled={busy} />
          <Toggle label="HD 2K" active={hd} onClick={() => setHd(!hd)} disabled={busy} />
          <Toggle label="Intro" active={intro} onClick={() => setIntro(!intro)} disabled={busy || content !== 'photos'} />
          <Toggle label="Outro placa" active={outro} onClick={() => setOutro(!outro)} disabled={busy} />
        </div>

        {/* EFFECTS PACK */}
        <div className="border-t border-neutral-200 pt-3 space-y-3">
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-brand" />
            <span className="text-[10.5px] font-bold tracking-[1.5px] uppercase text-brand">Effects pack</span>
          </div>

          {/* Color grade */}
          <div>
            <label className="label">Color grade</label>
            <div className="grid grid-cols-7 gap-1">
              {COLOR_GRADES.map((g) => (
                <button
                  key={g.id}
                  disabled={busy}
                  onClick={() => setColorGrade(g.id)}
                  className={`rounded border-2 transition overflow-hidden ${colorGrade === g.id ? 'border-brand' : 'border-neutral-200'}`}
                  title={g.label}
                >
                  <div className="aspect-square" style={{ background: g.preview }} />
                  <div className="text-[8px] py-0.5 text-center text-neutral-600 truncate px-0.5">{g.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Effect toggles */}
          <div className="grid grid-cols-6 gap-1.5">
            <Toggle label="Speed ramp" active={speedRamp} onClick={() => setSpeedRamp(!speedRamp)} disabled={busy} />
            <Toggle label="Zoom punch" active={zoomPunch} onClick={() => setZoomPunch(!zoomPunch)} disabled={busy} />
            <Toggle label="Light leak" active={lightLeak} onClick={() => setLightLeak(!lightLeak)} disabled={busy} />
            <Toggle label="Film grain" active={filmGrain} onClick={() => setFilmGrain(!filmGrain)} disabled={busy} />
            <Toggle label="RGB split" active={rgbSplit} onClick={() => setRgbSplit(!rgbSplit)} disabled={busy} />
            <Toggle label="Glitch" active={glitchFlash} onClick={() => setGlitchFlash(!glitchFlash)} disabled={busy} />
          </div>

          {/* Text overlays */}
          <div>
            <label className="label">Texto animado sobre fotos</label>
            <div className="grid grid-cols-4 gap-1">
              {TEXT_STYLES.map((s) => (
                <button
                  key={s.id}
                  disabled={busy || content === 'placa'}
                  onClick={() => setTextOverlays(s.id)}
                  className={`h-8 text-[11px] rounded border ${textOverlays === s.id ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'} disabled:opacity-40`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {content === 'placa' && (
              <p className="text-[10px] text-neutral-400 mt-1">Sólo aplica al modo "Solo fotos/videos".</p>
            )}
          </div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 text-[10.5px] font-mono text-neutral-600 flex justify-between">
          <span>{items.length} clips · {totalDuration.toFixed(1)}s · {fps} fps</span>
          <span>{format === 'story' ? '1080×1920' : '1080×1350'}{hd ? ' (HD 2K)' : ''} · H.264 · {hd ? '14' : '10'} Mbps</span>
        </div>

        {previewUrl && (
          <div className="relative">
            <video src={previewUrl} controls autoPlay loop muted playsInline className="w-full max-h-[55vh] bg-black rounded" />
            <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono">
              {(resultBlob ? resultBlob.size / 1024 / 1024 : 0).toFixed(1)} MB
            </div>
          </div>
        )}

        {busy && (
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-neutral-600 font-mono">
              <span>{phaseLabel}…</span>
              <span>{progress.cur} / {progress.total} · {progressPct}% · {elapsed.toFixed(1)}s</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded overflow-hidden">
              <div className="h-full bg-brand transition-all duration-100" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {busy ? (
            <button className="btn" onClick={handleCancel}>Cancelar</button>
          ) : (
            <>
              {resultBlob && (
                <button className="btn btn-primary" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" /> Descargar MP4
                </button>
              )}
              <button
                className={resultBlob ? 'btn' : 'btn btn-primary'}
                onClick={handleGenerate}
                disabled={!supported || items.length === 0}
              >
                {resultBlob ? <><Play className="w-3.5 h-3.5" /> Regenerar</> : <><Film className="w-3.5 h-3.5" /> Generar Reel</>}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void; disabled?: boolean }> = ({ label, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`h-8 text-[10.5px] rounded border transition ${active ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200 text-neutral-700'} disabled:opacity-40`}
  >
    {label}
  </button>
);
