import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { generateReel, isReelSupported } from '@/lib/reel';
import { downloadBlob } from '@/lib/export';
import { slugify } from '@/lib/format';
import { Film, Download, Loader2, Play } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  placaRef: React.RefObject<HTMLDivElement>;
}

export const ReelModal: React.FC<Props> = ({ open, onClose, placaRef }) => {
  const photos = usePlacaStore((s) => s.photos);
  const format = usePlacaStore((s) => s.format);
  const data = usePlacaStore((s) => s.data);

  const [content, setContent] = useState<'photos' | 'placa'>('photos');
  const [duration, setDuration] = useState(3); // seconds per photo
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [zoom, setZoom] = useState(15); // 0–30 percent zoom
  const [transition, setTransition] = useState<'cut' | 'fade'>('fade');

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'capturing' | 'encoding'>('idle');
  const [progress, setProgress] = useState({ cur: 0, total: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!open) {
      abortRef.current = false;
      setBusy(false);
      setPhase('idle');
      setProgress({ cur: 0, total: 0 });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setResultBlob(null);
    }
  }, [open]);

  if (!open) return null;

  const totalSeconds = photos.length * duration;
  const supported = isReelSupported();

  const handleGenerate = async () => {
    if (!placaRef.current) return;
    abortRef.current = false;
    setBusy(true);
    setPhase('capturing');
    setProgress({ cur: 0, total: photos.length });
    try {
      const result = await generateReel({
        placaEl: placaRef.current,
        format,
        durationPerPhoto: duration,
        fps,
        kenBurnsZoom: 1 + zoom / 100,
        transition,
        transitionDuration: 0.5,
        content,
        onProgress: (ph, cur, total) => {
          setPhase(ph);
          setProgress({ cur, total });
        },
        onAbort: () => abortRef.current,
      });
      setResultBlob(result.blob);
      setPreviewUrl(URL.createObjectURL(result.blob));
      setPhase('idle');
    } catch (e: any) {
      if (!String(e?.message).includes('Cancelado')) {
        alert('Error generando Reel: ' + (e?.message || e));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const name = `zamboni_reel_${slugify(data.barrio || data.addr) || 'placa'}_${format}.mp4`;
    downloadBlob(resultBlob, name);
  };

  const progressPct = progress.total > 0 ? Math.round((progress.cur / progress.total) * 100) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Reel MP4 · Story Video" width={620}>
      <div className="p-5 space-y-4">
        {!supported && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-xs text-yellow-900">
            ⚠ Tu navegador no soporta WebCodecs. Usá Chrome o Edge actualizado para esta función.
          </div>
        )}

        {photos.length === 0 && (
          <div className="bg-neutral-50 border border-neutral-200 rounded p-4 text-sm text-neutral-600 text-center">
            Subí al menos 2 fotos para generar el Reel.
          </div>
        )}

        {photos.length > 0 && (
          <>
            {/* Content mode */}
            <div>
              <label className="label">Contenido del reel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={busy}
                  onClick={() => setContent('photos')}
                  className={`p-2.5 rounded border-2 text-left transition ${content === 'photos' ? 'border-brand bg-brand/5' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <div className="text-xs font-bold mb-0.5">Solo fotos</div>
                  <div className="text-[10px] text-neutral-500 leading-tight">Sin logo ni textos. Cover-fit al frame.</div>
                </button>
                <button
                  disabled={busy}
                  onClick={() => setContent('placa')}
                  className={`p-2.5 rounded border-2 text-left transition ${content === 'placa' ? 'border-brand bg-brand/5' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  <div className="text-xs font-bold mb-0.5">Con placa</div>
                  <div className="text-[10px] text-neutral-500 leading-tight">Incluye logo, textos y stickers.</div>
                </button>
              </div>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Duración por foto</label>
                <div className="grid grid-cols-4 gap-1">
                  {[2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      disabled={busy}
                      onClick={() => setDuration(s)}
                      className={`h-8 text-xs rounded border transition ${duration === s ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">FPS</label>
                <div className="grid grid-cols-3 gap-1">
                  {[24, 30, 60].map((f) => (
                    <button
                      key={f}
                      disabled={busy}
                      onClick={() => setFps(f as any)}
                      className={`h-8 text-xs rounded border transition ${fps === f ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Ken Burns zoom · {zoom}%</label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={zoom}
                  disabled={busy}
                  onChange={(e) => setZoom(parseInt(e.target.value))}
                  className="w-full accent-brand"
                />
              </div>
              <div>
                <label className="label">Transición</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['cut', 'fade'] as const).map((t) => (
                    <button
                      key={t}
                      disabled={busy}
                      onClick={() => setTransition(t)}
                      className={`h-8 text-xs rounded border transition capitalize ${transition === t ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}
                    >
                      {t === 'cut' ? 'Corte' : 'Fade'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 text-[11px] text-neutral-600 flex justify-between font-mono">
              <span>{photos.length} fotos · {totalSeconds}s · {fps} fps</span>
              <span>{format === 'story' ? '1080×1920' : '1080×1350'} · H.264 / MP4</span>
            </div>

            {/* Preview */}
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full max-h-[55vh] bg-black rounded"
              />
            )}

            {/* Progress */}
            {busy && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-neutral-600 font-mono">
                  <span>{phase === 'capturing' ? 'Capturando placas…' : 'Encodeando video…'}</span>
                  <span>{progress.cur} / {progress.total} · {progressPct}%</span>
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
                    {resultBlob ? (
                      <><Play className="w-3.5 h-3.5" /> Regenerar</>
                    ) : (
                      <><Film className="w-3.5 h-3.5" /> Generar Reel</>
                    )}
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
