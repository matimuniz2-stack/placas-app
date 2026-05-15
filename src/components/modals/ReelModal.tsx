import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { generateReel, isReelSupported, PRESETS, type Transition, type Preset, type ReelOpts } from '@/lib/reel';
import { downloadBlob } from '@/lib/export';
import { slugify } from '@/lib/format';
import { Film, Download, Play, Music, Sparkles, Zap, Minus, Crown, Upload, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  placaRef: React.RefObject<HTMLDivElement>;
}

const PRESET_META: Record<Preset, { label: string; icon: any; desc: string; accent: string }> = {
  cinematic: { label: 'Cinemático',  icon: Sparkles, desc: 'Slow + warm + vignette + intro/outro', accent: 'bg-purple-50 border-purple-300 text-purple-700' },
  energetic: { label: 'Energético',  icon: Zap,      desc: 'Rápido, 60fps, slides agresivos',       accent: 'bg-orange-50 border-orange-300 text-orange-700' },
  minimal:   { label: 'Minimal',     icon: Minus,    desc: 'Sin transiciones, sin efectos',         accent: 'bg-neutral-50 border-neutral-300 text-neutral-700' },
  pro:       { label: 'Pro Studio',  icon: Crown,    desc: 'HD 2K + intro + outro + 14Mbps',        accent: 'bg-brand/10 border-brand text-brand' },
};

const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: 'cut',        label: 'Corte' },
  { id: 'fade',       label: 'Fade' },
  { id: 'slide-left', label: 'Slide ←' },
  { id: 'slide-up',   label: 'Slide ↑' },
  { id: 'zoom-blur',  label: 'Zoom blur' },
];

export const ReelModal: React.FC<Props> = ({ open, onClose, placaRef }) => {
  const photos = usePlacaStore((s) => s.photos);
  const format = usePlacaStore((s) => s.format);
  const data = usePlacaStore((s) => s.data);

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
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // State
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'capturing' | 'encoding' | 'audio'>('idle');
  const [progress, setProgress] = useState({ cur: 0, total: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef(false);

  // Apply preset
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
  };

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

  // elapsed timer while busy
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(((Date.now() - start) / 1000)), 100);
    return () => clearInterval(id);
  }, [busy]);

  if (!open) return null;

  const totalDuration =
    photos.length * duration + (intro ? 1.2 : 0) + (outro ? 1.8 : 0);
  const supported = isReelSupported();

  const handleGenerate = async () => {
    if (!placaRef.current) return;
    abortRef.current = false;
    setBusy(true);
    setPhase('capturing');
    setProgress({ cur: 0, total: photos.length });
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
        audioFile,
        bitrate: hd ? 14_000_000 : 10_000_000,
        onProgress: (ph, cur, total) => { setPhase(ph); setProgress({ cur, total }); },
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
  const phaseLabel = phase === 'capturing' ? 'Capturando fotos' : phase === 'encoding' ? 'Encodeando H.264' : phase === 'audio' ? 'Procesando audio' : '';

  return (
    <Modal open={open} onClose={onClose} title="Reel MP4 · Cinematic Studio" width={680}>
      <div className="p-5 space-y-4">
        {!supported && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-xs text-yellow-900">
            ⚠ Tu navegador no soporta WebCodecs. Usá Chrome o Edge actualizado.
          </div>
        )}

        {photos.length === 0 ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded p-4 text-sm text-neutral-600 text-center">
            Subí al menos 2 fotos para generar el Reel.
          </div>
        ) : (
          <>
            {/* PRESETS */}
            <div>
              <label className="label">Preset</label>
              <div className="grid grid-cols-4 gap-1.5">
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
                      <div className="text-[9px] opacity-70 leading-tight mt-0.5 line-clamp-2">{meta.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content + Audio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Contenido</label>
                <div className="grid grid-cols-2 gap-1">
                  <button disabled={busy} onClick={() => setContent('photos')} className={`p-2 rounded border text-left text-[11px] transition ${content === 'photos' ? 'border-brand bg-brand/5' : 'border-neutral-200'}`}>
                    <b>Solo fotos</b>
                    <div className="text-[9px] opacity-70">Sin logo ni textos</div>
                  </button>
                  <button disabled={busy} onClick={() => setContent('placa')} className={`p-2 rounded border text-left text-[11px] transition ${content === 'placa' ? 'border-brand bg-brand/5' : 'border-neutral-200'}`}>
                    <b>Con placa</b>
                    <div className="text-[9px] opacity-70">Branding completo</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Música de fondo</label>
                <label className="flex items-center justify-between gap-2 h-[58px] px-2.5 border border-neutral-200 rounded cursor-pointer hover:border-neutral-300 transition">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Music className="w-3.5 h-3.5 flex-shrink-0 text-brand" />
                    <span className="text-[11px] truncate">{audioFile ? audioFile.name : 'Subí MP3 (opcional)'}</span>
                  </div>
                  {audioFile && (
                    <button onClick={(e) => { e.preventDefault(); setAudioFile(null); }} className="text-neutral-400 hover:text-brand">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
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

            {/* Transition */}
            <div>
              <label className="label">Transición</label>
              <div className="grid grid-cols-5 gap-1">
                {TRANSITIONS.map((t) => (
                  <button key={t.id} disabled={busy} onClick={() => setTransition(t.id)} className={`h-8 text-[10.5px] rounded border ${transition === t.id ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-5 gap-1.5">
              <Toggle label="Vignette" active={vignette} onClick={() => setVignette(!vignette)} disabled={busy} />
              <Toggle label="Cinematic" active={cinematicLook} onClick={() => setCinematicLook(!cinematicLook)} disabled={busy} />
              <Toggle label="HD 2K" active={hd} onClick={() => setHd(!hd)} disabled={busy} />
              <Toggle label="Intro" active={intro} onClick={() => setIntro(!intro)} disabled={busy || content !== 'photos'} />
              <Toggle label="Outro placa" active={outro} onClick={() => setOutro(!outro)} disabled={busy} />
            </div>

            {/* Info bar */}
            <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 text-[10.5px] font-mono text-neutral-600 flex justify-between">
              <span>{photos.length} fotos · {totalDuration.toFixed(1)}s · {fps} fps</span>
              <span>{format === 'story' ? '1080×1920' : '1080×1350'}{hd ? ' (HD 2K)' : ''} · H.264 / MP4 · {hd ? '14' : '10'} Mbps</span>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="relative">
                <video
                  src={previewUrl}
                  controls autoPlay loop muted playsInline
                  className="w-full max-h-[55vh] bg-black rounded"
                />
                <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono">
                  {(resultBlob ? resultBlob.size / 1024 / 1024 : 0).toFixed(1)} MB
                </div>
              </div>
            )}

            {/* Progress */}
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

            {/* Actions */}
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
                    disabled={!supported || photos.length === 0}
                  >
                    {resultBlob ? <><Play className="w-3.5 h-3.5" /> Regenerar</> : <><Film className="w-3.5 h-3.5" /> Generar Reel</>}
                  </button>
                </>
              )}
            </div>
          </>
        )}
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
