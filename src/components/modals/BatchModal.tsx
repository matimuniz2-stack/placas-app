import React, { useRef, useState } from 'react';
import { Modal } from './Modal';
import {
  parseCSV,
  parseXLSX,
  rowToPlacaData,
  buildCsvTemplate,
  type BatchRow,
} from '@/lib/batch';
import { usePlacaStore } from '@/lib/store';
import { extractFromUrl } from '@/lib/urlExtract';
import { captureToDataUrl, buildFilename, downloadBlob } from '@/lib/export';
import { buildCaption, slugify } from '@/lib/format';
import JSZip from 'jszip';
import {
  Upload,
  Download,
  FileSpreadsheet,
  PlayCircle,
  Loader2,
  X,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  placaRef: React.RefObject<HTMLDivElement>;
}

export const BatchModal: React.FC<Props> = ({ open, onClose, placaRef }) => {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  // Settings
  const [formats, setFormats] = useState<{ story: boolean; post: boolean }>({ story: true, post: true });
  const [includeCaption, setIncludeCaption] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<'casual_emoji' | 'casual' | 'formal' | 'premium' | 'urgente'>('casual_emoji');
  const [autoFetchPhotos, setAutoFetchPhotos] = useState(true);

  // Progress
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ cur: 0, total: 0, step: '' });
  const [generated, setGenerated] = useState<{ ok: number; failed: number; failedNames: string[] }>({ ok: 0, failed: 0, failedNames: [] });
  const abortRef = useRef(false);

  const handleFile = async (file: File) => {
    setError('');
    setFileName(file.name);
    try {
      let parsed: BatchRow[] = [];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        parsed = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const ab = await file.arrayBuffer();
        parsed = parseXLSX(ab);
      } else {
        setError('Formato no soportado. Usá CSV o Excel (.xlsx).');
        return;
      }
      if (parsed.length === 0) {
        setError('No se encontraron filas válidas. Revisá los nombres de columnas.');
        return;
      }
      setRows(parsed);
    } catch (e: any) {
      setError(e?.message || 'Error parseando archivo');
    }
  };

  const downloadTemplate = () => {
    const csv = buildCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = 'zamboni_batch_template.csv';
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const handleGenerate = async () => {
    if (rows.length === 0 || !placaRef.current) return;
    abortRef.current = false;
    setBusy(true);
    setGenerated({ ok: 0, failed: 0, failedNames: [] });
    const totalSteps = rows.length * (
      (autoFetchPhotos ? 1 : 0) +
      (formats.story ? 1 : 0) +
      (formats.post ? 1 : 0) +
      (includeCaption ? 1 : 0)
    );
    setProgress({ cur: 0, total: totalSteps, step: 'Inicializando…' });

    const store = usePlacaStore.getState();
    // Save current state so we can restore at the end
    const snapshot = {
      data: store.data,
      photos: store.photos,
      activePhotoIdx: store.activePhotoIdx,
      format: store.format,
    };

    const zip = new JSZip();
    let stepCounter = 0;
    let okCount = 0;
    let failCount = 0;
    const failedNames: string[] = [];

    try {
      for (let i = 0; i < rows.length; i++) {
        if (abortRef.current) break;
        const row = rows[i];
        const placaData = rowToPlacaData(row);
        const propName = `${(i + 1).toString().padStart(2, '0')}_${slugify(placaData.barrio || '') || 'sn'}_${slugify(placaData.addr || '') || 'addr'}`.slice(0, 80);
        const folder = zip.folder(propName)!;

        try {
          // Step 1: load data
          usePlacaStore.setState({ data: { ...store.data, ...placaData } as any });
          // Step 2: load photos
          let photoUrls: string[] = [];
          if (row.photoUrl) photoUrls.push(row.photoUrl);
          if (autoFetchPhotos && row.listingUrl) {
            setProgress({ cur: ++stepCounter, total: totalSteps, step: `${i + 1}/${rows.length} · Trayendo fotos del listing…` });
            try {
              const extracted = await extractFromUrl(row.listingUrl);
              if (extracted?.photoUrls?.length) {
                photoUrls = extracted.photoUrls.slice(0, 6);
              }
            } catch (e) {
              console.warn('extract failed for', row.listingUrl, e);
            }
          } else if (autoFetchPhotos) {
            stepCounter++;
          }

          // Download photos as dataURLs
          const downloaded: string[] = [];
          for (const u of photoUrls) {
            try {
              const res = await fetch(u, { mode: 'cors' });
              if (!res.ok) continue;
              const blob = await res.blob();
              if (blob.size > 10 * 1024 * 1024) continue;
              const dataUrl: string = await new Promise((res2, rej) => {
                const r = new FileReader();
                r.onload = () => res2(r.result as string);
                r.onerror = () => rej(r.error);
                r.readAsDataURL(blob);
              });
              downloaded.push(dataUrl);
            } catch {
              continue;
            }
          }
          usePlacaStore.setState({ photos: downloaded.map((url) => ({ url, pos: { x: 50, y: 50 }, zoom: 1, filter: { b: 100, c: 100, s: 100 } })) as any, activePhotoIdx: 0 });

          // Wait for React + fonts
          await new Promise((r) => setTimeout(r, 280));

          // Step 3: capture story
          if (formats.story) {
            setProgress({ cur: ++stepCounter, total: totalSteps, step: `${i + 1}/${rows.length} · Story…` });
            usePlacaStore.setState({ format: 'story' });
            await new Promise((r) => setTimeout(r, 200));
            const storyUrl = await captureToDataUrl(placaRef.current!, 1080, 1920, 'png', 1);
            folder.file('story_1080x1920.png', storyUrl.split(',')[1], { base64: true });
          }
          // Step 4: capture post
          if (formats.post) {
            setProgress({ cur: ++stepCounter, total: totalSteps, step: `${i + 1}/${rows.length} · Post…` });
            usePlacaStore.setState({ format: 'post' });
            await new Promise((r) => setTimeout(r, 200));
            const postUrl = await captureToDataUrl(placaRef.current!, 1080, 1350, 'png', 1);
            folder.file('post_1080x1350.png', postUrl.split(',')[1], { base64: true });
          }
          // Step 5: caption
          if (includeCaption) {
            setProgress({ cur: ++stepCounter, total: totalSteps, step: `${i + 1}/${rows.length} · Caption…` });
            const cap = buildCaption({ ...store.data, ...placaData } as any, captionStyle);
            folder.file('caption.txt', cap);
          }
          // Carousel slides (if many photos)
          if (downloaded.length > 1 && formats.story) {
            const carouselFolder = folder.folder('carrusel');
            for (let p = 0; p < downloaded.length; p++) {
              usePlacaStore.setState({ activePhotoIdx: p });
              await new Promise((r) => setTimeout(r, 180));
              const slide = await captureToDataUrl(placaRef.current!, 1080, 1920, 'png', 1);
              carouselFolder!.file(`slide_${String(p + 1).padStart(2, '0')}.png`, slide.split(',')[1], { base64: true });
            }
          }

          okCount++;
        } catch (e: any) {
          console.warn(`Failed row ${i}`, e);
          failCount++;
          failedNames.push(propName + ' (' + (e?.message || 'error') + ')');
        }
      }

      // Build summary CSV
      const summary = rows.map((r, i) => {
        const d = rowToPlacaData(r);
        return [i + 1, d.addr, d.barrio, d.price, d.currency, d.op, d.amb, d.m2].join(',');
      }).join('\n');
      zip.file('_resumen.csv', '#,addr,barrio,price,currency,op,amb,m2\n' + summary);

      setProgress({ cur: totalSteps, total: totalSteps, step: 'Empaquetando ZIP…' });
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `zamboni_batch_${rows.length}props_${new Date().toISOString().slice(0, 10)}.zip`);

      setGenerated({ ok: okCount, failed: failCount, failedNames });
    } catch (e: any) {
      setError(e?.message || 'Error generando batch');
    } finally {
      // Restore state
      usePlacaStore.setState(snapshot as any);
      setBusy(false);
    }
  };

  if (!open) return null;

  const totalSteps = rows.length * (
    (autoFetchPhotos ? 1 : 0) +
    (formats.story ? 1 : 0) +
    (formats.post ? 1 : 0) +
    (includeCaption ? 1 : 0)
  );

  return (
    <Modal open={open} onClose={onClose} title="Batch · Generar lote de placas" width={780}>
      <div className="p-5 space-y-4">
        {/* Upload zone */}
        {rows.length === 0 && (
          <>
            <div className="bg-neutral-50 border border-neutral-200 rounded p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand" />
                <span>Cargar lote de propiedades</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Subí un CSV o Excel con todas las propiedades. La app genera Story + Post + caption para cada una y descarga un ZIP gigante con todo.
              </p>
              <button onClick={downloadTemplate} className="text-brand underline text-[11px] flex items-center gap-1">
                <Download className="w-3 h-3" /> Descargar template CSV de ejemplo
              </button>
            </div>

            <label className="block border-2 border-dashed border-neutral-300 rounded-md py-8 px-3 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Upload className="w-7 h-7 mx-auto text-neutral-400 mb-2" />
              <div className="text-sm text-neutral-600 font-medium">Subir CSV o Excel</div>
              <div className="text-[10px] text-neutral-400 mt-1">.csv · .xlsx · .xls</div>
            </label>

            <div className="text-[11px] text-neutral-500">
              <strong>Columnas reconocidas</strong> (case-insensitive, en español o inglés):
              <code className="block mt-1 bg-neutral-50 p-1.5 rounded text-[10px] font-mono leading-relaxed">
                addr · barrio · amb · m2 · baths · cochera · price · currency · op · expensas · antiguedad · desc · photoUrl · listingUrl
              </code>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2.5 rounded flex gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}

        {/* Loaded rows */}
        {rows.length > 0 && !busy && generated.ok === 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{rows.length} propiedades cargadas</span>
                <span className="text-[10px] text-neutral-400 font-normal">({fileName})</span>
              </div>
              <button onClick={() => { setRows([]); setFileName(''); }} className="btn btn-ghost">
                <X className="w-3.5 h-3.5" /> Cambiar archivo
              </button>
            </div>

            {/* Preview */}
            <div className="border border-neutral-200 rounded overflow-hidden max-h-44 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5">#</th>
                    <th className="text-left px-2 py-1.5">Dirección</th>
                    <th className="text-left px-2 py-1.5">Barrio</th>
                    <th className="text-left px-2 py-1.5">Amb</th>
                    <th className="text-left px-2 py-1.5">m²</th>
                    <th className="text-left px-2 py-1.5">Precio</th>
                    <th className="text-left px-2 py-1.5">Op</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r, i) => {
                    const d = rowToPlacaData(r);
                    return (
                      <tr key={i} className="border-t border-neutral-100">
                        <td className="px-2 py-1 text-neutral-400">{i + 1}</td>
                        <td className="px-2 py-1 truncate max-w-[180px]">{d.addr || '—'}</td>
                        <td className="px-2 py-1">{d.barrio || '—'}</td>
                        <td className="px-2 py-1">{d.amb || '—'}</td>
                        <td className="px-2 py-1">{d.m2 || '—'}</td>
                        <td className="px-2 py-1">{d.currency} {d.price || '—'}</td>
                        <td className="px-2 py-1">{d.op}</td>
                      </tr>
                    );
                  })}
                  {rows.length > 30 && (
                    <tr><td colSpan={7} className="px-2 py-1 text-center text-neutral-400">… y {rows.length - 30} más</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Settings */}
            <div className="space-y-2.5">
              <div>
                <label className="label">Formatos a generar</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setFormats((f) => ({ ...f, story: !f.story }))}
                    className={`btn justify-center ${formats.story ? 'btn-primary' : ''}`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Story 1080×1920
                  </button>
                  <button
                    onClick={() => setFormats((f) => ({ ...f, post: !f.post }))}
                    className={`btn justify-center ${formats.post ? 'btn-primary' : ''}`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Post 1080×1350
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={includeCaption} onChange={(e) => setIncludeCaption(e.target.checked)} className="accent-brand" />
                  <FileText className="w-3 h-3" />
                  <span>Incluir caption.txt por propiedad</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={autoFetchPhotos} onChange={(e) => setAutoFetchPhotos(e.target.checked)} className="accent-brand" />
                  <span>Bajar fotos auto desde listingUrl</span>
                </label>
              </div>

              {includeCaption && (
                <div>
                  <label className="label">Estilo de caption</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['casual_emoji', 'casual', 'formal', 'premium', 'urgente'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setCaptionStyle(s)}
                        className={`h-7 text-[10px] rounded border ${captionStyle === s ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}
                      >
                        {s.replace('_emoji', ' + 🙂')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 text-[10.5px] font-mono text-neutral-600 flex justify-between">
              <span>{rows.length} propiedades · {totalSteps} pasos totales</span>
              <span>Usa template/theme actual del editor</span>
            </div>

            <button onClick={handleGenerate} disabled={!formats.story && !formats.post} className="btn btn-primary w-full justify-center">
              <PlayCircle className="w-3.5 h-3.5" /> Generar batch · {rows.length} placas
            </button>
          </>
        )}

        {busy && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <Loader2 className="w-7 h-7 mx-auto text-brand animate-spin mb-2" />
              <div className="text-sm font-medium">{progress.step}</div>
              <div className="text-[10px] text-neutral-400 font-mono mt-1">{progress.cur} / {progress.total}</div>
            </div>
            <div className="h-2 bg-neutral-100 rounded overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-100"
                style={{ width: `${progress.total > 0 ? (progress.cur / progress.total) * 100 : 0}%` }}
              />
            </div>
            <button className="btn w-full justify-center" onClick={() => { abortRef.current = true; }}>
              Cancelar
            </button>
          </div>
        )}

        {generated.ok > 0 && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-center">
              <CheckCircle className="w-7 h-7 mx-auto text-emerald-600 mb-1.5" />
              <div className="text-sm font-bold">Batch generado ✓</div>
              <div className="text-[11px] text-neutral-600 mt-1">
                {generated.ok} OK · {generated.failed} fallidas · ZIP descargado
              </div>
              {generated.failed > 0 && (
                <details className="text-left mt-2">
                  <summary className="text-[10px] text-neutral-500 cursor-pointer">Ver fallidas</summary>
                  <ul className="text-[10px] text-neutral-500 mt-1 space-y-0.5">
                    {generated.failedNames.map((n, i) => <li key={i}>· {n}</li>)}
                  </ul>
                </details>
              )}
            </div>
            <button onClick={() => { setRows([]); setGenerated({ ok: 0, failed: 0, failedNames: [] }); setFileName(''); }} className="btn w-full justify-center">
              Cargar otro lote
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
