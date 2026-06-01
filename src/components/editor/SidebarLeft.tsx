import React, { useState } from 'react';
import { usePlacaStore } from '@/lib/store';
import { Upload, Image, X, FileDown, Wand2, Trash2, Link2, Crop } from 'lucide-react';
import { removeBackground } from '@/lib/bgRemove';
import { extractFromUrl } from '@/lib/urlExtract';
import { amenString } from '@/lib/format';
import { CropModal } from '@/components/modals/CropModal';

type Tab = 'datos' | 'fotos' | 'agente';

export const SidebarLeft: React.FC = () => {
  const [tab, setTab] = useState<Tab>('datos');
  const open = usePlacaStore((s) => s.sidebarLeftOpen);
  if (!open) return null;

  return (
    <aside
      className="bg-white border-r border-neutral-200 flex flex-col h-full"
      style={{ width: 280, flexShrink: 0 }}
    >
      <div className="flex border-b border-neutral-200 bg-panel">
        {(['datos', 'fotos', 'agente'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[11px] font-semibold tracking-[1.5px] uppercase transition ${tab === t ? 'bg-white text-brand border-b-2 border-brand' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === 'datos' && <DatosTab />}
        {tab === 'fotos' && <FotosTab />}
        {tab === 'agente' && <AgenteTab />}
      </div>
    </aside>
  );
};

const DatosTab: React.FC = () => {
  const data = usePlacaStore((s) => s.data);
  const patchData = usePlacaStore((s) => s.patchData);
  const [pasting, setPasting] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [progress, setProgress] = useState<string>('');

  const fetchAsDataUrl = async (url: string, timeoutMs = 8000): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { mode: 'cors', signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const b = await res.blob();
      if (b.size > 8 * 1024 * 1024) return null; // skip > 8MB
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(b);
      });
    } catch {
      return null;
    }
  };

  const handlePaste = async () => {
    if (!pasteUrl) return;
    // Confirm before overwriting existing data
    const hasExisting = !!(data.addr || data.barrio || data.price);
    if (hasExisting && !confirm('Esto va a reemplazar los datos actuales del placa y las fotos cargadas. ¿Continuar?')) {
      return;
    }
    setPasting(true);
    setProgress('Extrayendo datos…');
    try {
      const extracted = await extractFromUrl(pasteUrl);
      if (!extracted) {
        alert('No se pudo extraer datos de esa URL. Probá con Mercado Libre, Zonaprop o Argenprop.');
        return;
      }

      const { photoUrl, photoUrls, ...rest } = extracted;
      patchData(rest);

      const urls = (photoUrls && photoUrls.length ? photoUrls : photoUrl ? [photoUrl] : []).slice(0, 6);
      if (urls.length === 0) return;

      const { addPhotos: addPhotosNow } = usePlacaStore.getState();
      const downloaded: string[] = [];
      for (let i = 0; i < urls.length; i++) {
        setProgress(`Descargando foto ${i + 1}/${urls.length}…`);
        const data = await fetchAsDataUrl(urls[i]);
        if (data) downloaded.push(data);
      }
      if (downloaded.length) addPhotosNow(downloaded);
      else alert('No se pudieron descargar las fotos del listing (CORS o tamaño).');
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setPasting(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Killer feature: paste URL */}
      <div className="bg-brand/5 border border-brand/20 rounded-md p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wand2 className="w-3 h-3 text-brand" />
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-brand">Importar de listing</span>
        </div>
        <div className="flex gap-1.5">
          <input
            className="input flex-1"
            placeholder="Pegá URL ML / Zonaprop"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            disabled={pasting}
          />
          <button className="btn btn-primary px-2.5" disabled={pasting || !pasteUrl} onClick={handlePaste}>
            {pasting ? '…' : <Link2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        {progress && (
          <div className="text-[10px] text-brand mt-1.5 font-mono">{progress}</div>
        )}
      </div>

      <div>
        <label className="label">Operación</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['Venta', 'Alquiler'] as const).map((op) => (
            <button
              key={op}
              onClick={() => patchData({ op })}
              className={`h-8 rounded text-xs font-medium border transition ${data.op === op ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      <Field label="Dirección" v={data.addr} on={(v) => patchData({ addr: v })} />
      <Field label="Barrio" v={data.barrio} on={(v) => patchData({ barrio: v })} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Moneda</label>
          <select className="select" value={data.currency} onChange={(e) => patchData({ currency: e.target.value as any })}>
            <option>USD</option>
            <option>ARS</option>
          </select>
        </div>
        <Field label="Precio" v={data.price} on={(v) => patchData({ price: v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') })} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Amb" v={data.amb} on={(v) => patchData({ amb: v })} />
        <Field label="m²" v={data.m2} on={(v) => patchData({ m2: v })} />
        <Field label="Baños" v={data.baths} on={(v) => patchData({ baths: v })} />
      </div>

      <div>
        <label className="label">Línea de detalles (editable)</label>
        <input
          className="input"
          value={data.amenText || ''}
          placeholder={amenString(data) || 'ej: 3 amb · 85 m² · 2 baños · cochera'}
          onChange={(e) => patchData({ amenText: e.target.value })}
        />
        <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
          Vacío = se arma solo con amb/m²/baños/cochera. Escribí acá para personalizarla (ej: agregar "balcón", "apto profesional").
        </p>
      </div>

      <div>
        <label className="label">Cochera</label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['Sí', 'No'] as const).map((c) => (
            <button
              key={c}
              onClick={() => patchData({ cochera: c })}
              className={`h-8 rounded text-xs font-medium border transition ${data.cochera === c ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Expensas" v={data.expensas || ''} on={(v) => patchData({ expensas: v })} ph="$" />
        <Field label="Antigüedad" v={data.antiguedad || ''} on={(v) => patchData({ antiguedad: v })} ph="años" />
      </div>

      <Field label="Descripción" v={data.desc || ''} on={(v) => patchData({ desc: v })} ph="ej: Piso alto, vista al río" />

      <div>
        <label className="label">URL listing (para QR)</label>
        <input
          className="input"
          placeholder="https://..."
          value={data.listingUrl || ''}
          onChange={(e) => {
            patchData({ listingUrl: e.target.value });
            usePlacaStore.getState().setQrUrl(e.target.value);
          }}
        />
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; v: string; on: (v: string) => void; ph?: string }> = ({ label, v, on, ph }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" value={v} placeholder={ph} onChange={(e) => on(e.target.value)} />
  </div>
);

const FotosTab: React.FC = () => {
  const photos = usePlacaStore((s) => s.photos);
  const activeIdx = usePlacaStore((s) => s.activePhotoIdx);
  const addPhotos = usePlacaStore((s) => s.addPhotos);
  const removePhoto = usePlacaStore((s) => s.removePhoto);
  const setActive = usePlacaStore((s) => s.setActivePhoto);
  const patchActive = usePlacaStore((s) => s.patchActivePhoto);
  const replaceUrl = usePlacaStore((s) => s.replacePhotoUrl);
  const [bgLoading, setBgLoading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const active = photos[activeIdx];

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    Promise.all(
      arr.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(f);
          })
      )
    ).then((urls) => addPhotos(urls));
  };

  const handleBgRemove = async () => {
    if (!active) return;
    setBgLoading(true);
    try {
      const newUrl = await removeBackground(active.url);
      replaceUrl(activeIdx, newUrl);
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setBgLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label
        className="block border-2 border-dashed border-neutral-300 rounded-md py-6 px-3 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition"
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <Upload className="w-5 h-5 mx-auto text-neutral-400 mb-1.5" />
        <div className="text-xs text-neutral-600"><b>Click</b> o arrastrá<br/><span className="text-[10px] text-neutral-400">Múltiples imágenes OK</span></div>
      </label>

      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {photos.map((p, i) => (
              <div key={i} className="relative group">
                <button
                  onClick={() => setActive(i)}
                  className={`block w-full aspect-square bg-neutral-100 rounded overflow-hidden border-2 transition ${i === activeIdx ? 'border-brand' : 'border-transparent hover:border-neutral-300'}`}
                  style={{ backgroundImage: `url("${p.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {active && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <button className="btn justify-center" onClick={() => setCropOpen(true)}>
                  <Crop className="w-3.5 h-3.5" /> Recortar
                </button>
                <button className="btn justify-center" onClick={handleBgRemove} disabled={bgLoading}>
                  <Wand2 className="w-3.5 h-3.5" /> {bgLoading ? '…' : 'Quitar fondo'}
                </button>
              </div>

              <div className="space-y-2">
                <FilterSlider label="Brillo" v={active.filter.b} on={(b) => patchActive({ filter: { ...active.filter, b } })} />
                <FilterSlider label="Contraste" v={active.filter.c} on={(c) => patchActive({ filter: { ...active.filter, c } })} />
                <FilterSlider label="Saturación" v={active.filter.s} on={(s) => patchActive({ filter: { ...active.filter, s } })} />
                <FilterSlider label="Zoom" v={Math.round(active.zoom * 100)} min={100} max={300} on={(v) => patchActive({ zoom: v / 100 })} />
              </div>

              <button
                className="btn w-full justify-center"
                onClick={() => patchActive({ pos: { x: 50, y: 50 }, zoom: 1, filter: { b: 100, c: 100, s: 100 } })}
              >
                Resetear encuadre
              </button>
            </>
          )}
        </>
      )}
      <CropModal open={cropOpen} onClose={() => setCropOpen(false)} />
    </div>
  );
};

const FilterSlider: React.FC<{ label: string; v: number; on: (v: number) => void; min?: number; max?: number }> = ({ label, v, on, min = 0, max = 200 }) => (
  <div>
    <div className="flex justify-between text-[10px] text-neutral-500 mb-0.5">
      <span className="tracking-wider uppercase">{label}</span>
      <span className="text-brand font-semibold">{v}%</span>
    </div>
    <input type="range" min={min} max={max} value={v} onChange={(e) => on(parseInt(e.target.value))} className="w-full accent-brand h-1" />
  </div>
);

const AgenteTab: React.FC = () => {
  const agent = usePlacaStore((s) => s.agent);
  const setAgent = usePlacaStore((s) => s.setAgent);

  const handlePhoto = (file: File) => {
    const r = new FileReader();
    r.onload = () => setAgent({ ...(agent || { name: '', phone: '' }), photoUrl: r.result as string });
    r.readAsDataURL(file);
  };

  const toggle = () => {
    if (agent) setAgent(null);
    else setAgent({ name: 'María García', phone: '+54 11 5555-0000' });
  };

  return (
    <div className="space-y-3">
      <button className={`btn w-full justify-center ${agent ? 'btn-primary' : ''}`} onClick={toggle}>
        {agent ? 'Quitar watermark agente' : 'Activar watermark agente'}
      </button>

      {agent && (
        <>
          <Field label="Nombre" v={agent.name} on={(name) => setAgent({ ...agent, name })} />
          <Field label="Teléfono" v={agent.phone} on={(phone) => setAgent({ ...agent, phone })} />
          <div>
            <label className="label">Foto del agente</label>
            <label className="btn w-full justify-center">
              <Upload className="w-3.5 h-3.5" />
              {agent.photoUrl ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
            </label>
            {agent.photoUrl && (
              <img src={agent.photoUrl} className="w-14 h-14 rounded-full mt-2 mx-auto object-cover" alt="" />
            )}
          </div>
        </>
      )}
    </div>
  );
};
