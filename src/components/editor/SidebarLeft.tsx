import React, { useState, useRef } from 'react';
import { usePlacaStore, buildImportSlides } from '@/lib/store';
import { Upload, Image, X, FileDown, Wand2, Trash2, Link2, Crop, ScanLine, Sparkles } from 'lucide-react';
import { removeBackground } from '@/lib/bgRemove';
import { importFromUrl } from '@/lib/importListing';
import { extractFromImage } from '@/lib/visionExtract';
import { assembleWithAI } from '@/lib/aiAssemble';
import { pickCoverWithAI } from '@/lib/pickCover';
import { setDragPhoto } from '@/lib/dragPhoto';
import { amenString, attrChips } from '@/lib/format';
import { CropModal } from '@/components/modals/CropModal';
import type { PlacaData } from '@/types';

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
  const templateId = usePlacaStore((s) => s.templateId);
  const [pasting, setPasting] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [progress, setProgress] = useState<string>('');
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionNote, setVisionNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [aiPermuta, setAiPermuta] = useState(false);
  const [aiNotes, setAiNotes] = useState('');

  const handlePaste = async () => {
    if (!pasteUrl) return;
    setPasting(true);
    setProgress('Extrayendo datos…');
    try {
      const r = await importFromUrl(pasteUrl, setProgress);
      if (!r.photoCount) {
        // Datos sí, fotos no (CORS/tamaño): avisamos sin bloquear.
        setProgress('');
      }
    } catch (e: any) {
      alert('Error: ' + (e?.message || e));
    } finally {
      setPasting(false);
      setProgress('');
    }
  };

  // Foto/captura borrador → Claude visión lee y ordena los datos → autollena las placas.
  // Reemplaza el viaje a ChatGPT: el "diseño lindo" lo pone el template solo.
  const handleVisionImage = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setVisionBusy(true);
    setVisionNote('Leyendo el borrador con IA…');
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });

      const extracted = await extractFromImage(dataUrl);
      if (!extracted) {
        setVisionNote('');
        return;
      }
      const { photoUrl, photoUrls, amenities, layoutNote, ...rest } = extracted as any;
      patchData(rest);

      const amenLine = (amenities || []).slice(0, 6).join(' · ');
      setVisionNote('Armando placas…');
      buildImportSlides(amenLine);
      setVisionNote(layoutNote ? `✓ ${layoutNote}` : '✓ Datos cargados. Sumá la foto buena en la pestaña Fotos.');
    } catch (e: any) {
      if (e?.message === 'NO_API_KEY') {
        setVisionNote('Falta tu API key de Claude. Cargala en el botón ✨ Caption (se guarda una sola vez).');
      } else {
        setVisionNote('Error: ' + (e?.message || e));
      }
    } finally {
      setVisionBusy(false);
    }
  };

  // "Armá los textos por mí": la IA saca el título-diferencial + confirma tipo/operación.
  // No toca las fotos: la portada la elegís vos en la pestaña Fotos.
  const handleAssemble = async () => {
    setAiBusy(true);
    setAiNote('La IA está sacando el título…');
    try {
      const r = await assembleWithAI({
        permuta: aiPermuta,
        aptoCredito: !!usePlacaStore.getState().data.aptoCredito,
        notes: aiNotes,
      });
      setAiNote(r.note ? `✓ ${r.note}` : '✓ Placa armada. Revisá y ajustá lo que quieras.');
    } catch (e: any) {
      if (e?.message === 'NO_API_KEY') {
        setAiNote('Falta tu API key de Claude. Cargala en el botón ✨ Caption (se guarda una sola vez).');
      } else {
        setAiNote('Error: ' + (e?.message || e));
      }
    } finally {
      setAiBusy(false);
    }
  };

  // Permite pegar la captura directo con Ctrl+V sobre la zona.
  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        handleVisionImage(file);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Killer feature: sacar el título-diferencial con IA (texto; la portada la elige el usuario) */}
      <div className="bg-gradient-to-br from-brand/10 to-amber-100/40 border border-brand/30 rounded-md p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-brand">Título con IA</span>
        </div>
        <p className="text-[10px] text-neutral-600 leading-tight mb-2">
          La IA saca un <b>título-gancho</b> de la propiedad (ej "Exclusivo 4 ambientes") y confirma
          tipo y operación. La portada la elegís vos en la pestaña Fotos.
        </p>
        <label className="flex items-center gap-1.5 mb-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={aiPermuta}
            onChange={(e) => setAiPermuta(e.target.checked)}
            className="accent-brand"
          />
          <span className="text-[11px] text-neutral-700">Toma permuta</span>
        </label>
        <textarea
          className="input w-full text-xs resize-none mb-1.5"
          rows={2}
          placeholder="Notas para la IA (opcional): qué destacar, detalles especiales…"
          value={aiNotes}
          onChange={(e) => setAiNotes(e.target.value)}
          disabled={aiBusy}
        />
        <button className="btn btn-primary w-full text-xs" disabled={aiBusy} onClick={handleAssemble}>
          {aiBusy ? 'Pensando…' : '✨ Sacar título con IA'}
        </button>
        {aiNote && <div className="text-[10px] text-brand mt-1.5 font-medium leading-tight">{aiNote}</div>}
      </div>

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

      {/* Foto borrador → IA lee y ordena (reemplaza el viaje a ChatGPT) */}
      <div
        className="bg-amber-50 border border-amber-300/60 rounded-md p-2.5"
        onPaste={handlePasteEvent}
        tabIndex={0}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <ScanLine className="w-3 h-3 text-amber-700" />
          <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-amber-700">Foto borrador → IA</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleVisionImage(f);
            e.target.value = '';
          }}
        />
        <button
          className="btn btn-primary w-full text-xs"
          disabled={visionBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {visionBusy ? 'Leyendo…' : 'Subir / pegar captura'}
        </button>
        <div className="text-[10px] text-amber-700/80 mt-1.5 leading-tight">
          Subí (o pegá con Ctrl+V acá) la placa que armás a mano. Claude lee los datos y llena las 2 placas.
        </div>
        {visionNote && (
          <div className="text-[10px] text-amber-800 mt-1.5 font-medium">{visionNote}</div>
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

      <Field label="Tipo de propiedad" v={data.tipoPropiedad || ''} on={(v) => patchData({ tipoPropiedad: v })} ph="ej: Departamento" />
      <Field label="Título (gancho)" v={data.titulo || ''} on={(v) => patchData({ titulo: v })} ph="ej: Exclusivo 4 ambientes" />
      <Field label="Dirección" v={data.addr} on={(v) => patchData({ addr: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Barrio" v={data.barrio} on={(v) => patchData({ barrio: v })} />
        <Field label="Ciudad" v={data.city || ''} on={(v) => patchData({ city: v })} ph="Mar del Plata" />
      </div>

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

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">m² (tipo)</label>
          <select className="select" value={data.m2Tipo || ''} onChange={(e) => patchData({ m2Tipo: e.target.value as any })}>
            <option value="">—</option>
            <option value="totales">totales</option>
            <option value="cubiertos">cubiertos</option>
          </select>
        </div>
        <div>
          <label className="label">Toilette</label>
          <select className="select" value={data.toilette ? 'Sí' : 'No'} onChange={(e) => patchData({ toilette: e.target.value === 'Sí' })}>
            <option>No</option>
            <option>Sí</option>
          </select>
        </div>
        <div>
          <label className="label">Cochera (tipo)</label>
          <select className="select" value={data.cocheraTipo || ''} onChange={(e) => patchData({ cocheraTipo: e.target.value as any })}>
            <option value="">—</option>
            <option value="cubierta">cubierta</option>
            <option value="descubierta">descubierta</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Línea de detalles (editable)</label>
        <input
          className="input"
          value={data.amenText || amenString(data)}
          placeholder="ej: 3 amb · 85 m² · 2 baños · cochera"
          onChange={(e) => patchData({ amenText: e.target.value })}
        />
        <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
          Vacío = se arma solo con los datos clave de abajo. Escribí acá para personalizarla a mano.
        </p>
      </div>

      <DatosClave data={data} patchData={patchData} />

      <div>
        <Field
          label="Cocheras"
          v={data.cocheras ?? (data.cochera === 'Sí' ? '1' : '')}
          on={(v) => {
            const n = parseInt(v, 10);
            patchData({ cocheras: v, cochera: (!isNaN(n) && n > 0) ? 'Sí' : 'No' });
          }}
          ph="ej: 2"
        />
        <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Cantidad de cocheras. Aparece con el ícono de auto (1 = "cochera", 2+ = "cocheras"). Dejá vacío o 0 si no tiene.</p>
      </div>

      <div>
        <label className="label">Apto crédito</label>
        <div className="grid grid-cols-2 gap-1.5">
          {([['Sí', true], ['No', false]] as const).map(([lbl, val]) => (
            <button
              key={lbl}
              onClick={() => patchData({ aptoCredito: val })}
              className={`h-8 rounded text-xs font-medium border transition ${(data.aptoCredito ?? false) === val ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Muestra el bloque "APTO CRÉDITO · CONSULTANOS" (template Aviso Pro).</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Expensas" v={data.expensas || ''} on={(v) => patchData({ expensas: v })} ph="$" />
        <Field label="Antigüedad" v={data.antiguedad || ''} on={(v) => patchData({ antiguedad: v })} ph="años" />
      </div>

      <div className="bg-brand/5 border border-brand/20 rounded-md p-2.5 space-y-2">
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-brand">Emprendimiento / En pozo</div>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="En pozo" v={data.enPozo ?? false} on={(v) => patchData({ enPozo: v })} />
          <Toggle label="Financiación" v={data.financiacion ?? false} on={(v) => patchData({ financiacion: v })} />
        </div>
        <Field label="Fecha de entrega" v={data.entrega || ''} on={(v) => patchData({ entrega: v })} ph="ej: Dic 2026" />
        <p className="text-[10px] text-neutral-400 leading-snug">
          "En pozo" reemplaza la pill roja (EN POZO). La entrega aparece como box "ENTREGA ESTIMADA" en el template Nano.
        </p>
      </div>

      <div>
        <label className="label">Destacados (uno por línea)</label>
        <textarea
          className="input h-auto py-1.5"
          rows={4}
          value={(data.destacados || []).join('\n')}
          placeholder={'Dormitorio con vestidor\nBalcón al frente\nVentilación cruzada'}
          onChange={(e) => patchData({ destacados: e.target.value.split('\n') })}
        />
        <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
          Features de la propiedad. En el template Nano salen como pills con borde debajo de la línea de detalles.
        </p>
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

      {templateId === 't19' && (
        <div className="bg-brand/5 border border-brand/20 rounded-md p-2.5 space-y-2">
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-brand">Datos del aviso (Meta Ad)</div>
          <Field label="Ciudad" v={data.city || ''} on={(v) => patchData({ city: v })} ph="Mar del Plata" />
          <Field label="m² lote" v={data.lote || ''} on={(v) => patchData({ lote: v })} ph="ej: 431" />
          <Field label="Tagline" v={data.microTagline || ''} on={(v) => patchData({ microTagline: v })} ph="LISTA PARA DISFRUTAR" />
          <Field label="Beneficio (título)" v={data.benefitTitle || ''} on={(v) => patchData({ benefitTitle: v })} ph="ZONA RESIDENCIAL" />
          <Field label="Beneficio (subtítulo)" v={data.benefitSubtitle || ''} on={(v) => patchData({ benefitSubtitle: v })} ph="EXCELENTE ENTORNO" />
          <p className="text-[10px] text-neutral-400 leading-snug">El titular sale de Dirección (línea 1) + Barrio (línea 2 en rojo). El subtítulo, de Descripción o la línea de detalles.</p>
        </div>
      )}
    </div>
  );
};

const Toggle: React.FC<{ label: string; v: boolean; on: (v: boolean) => void }> = ({ label, v, on }) => (
  <div>
    <label className="label">{label}</label>
    <div className="grid grid-cols-2 gap-1.5">
      {([['Sí', true], ['No', false]] as const).map(([lbl, val]) => (
        <button
          key={lbl}
          onClick={() => on(val)}
          className={`h-8 rounded text-xs font-medium border transition ${v === val ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
        >
          {lbl}
        </button>
      ))}
    </div>
  </div>
);

const Field: React.FC<{ label: string; v: string; on: (v: string) => void; ph?: string }> = ({ label, v, on, ph }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" value={v} placeholder={ph} onChange={(e) => on(e.target.value)} />
  </div>
);

// Chips on/off de los datos clave que van en la línea de atributos de la placa.
// Tocar un chip lo muestra/oculta (attrsOn). Los valores se editan en los Fields de arriba.
const DatosClave: React.FC<{ data: PlacaData; patchData: (p: Partial<PlacaData>) => void }> = ({ data, patchData }) => {
  const chips = attrChips(data);
  if (!chips.length) return null;
  const toggle = (key: string, on: boolean) =>
    patchData({ attrsOn: { ...(data.attrsOn || {}), [key]: !on } });
  return (
    <div>
      <label className="label">Datos clave (en la placa)</label>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => toggle(c.key, c.on)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition ${c.on ? 'bg-brand text-white border-brand' : 'bg-white text-neutral-400 border-neutral-300 line-through'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Tocá para mostrar/ocultar cada dato. Prendé "Apto crédito", "Expensas" o "A estrenar" para sumarlos. Editá los valores en los campos de arriba.</p>
    </div>
  );
};

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
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const active = photos[activeIdx];

  const handlePickCover = async () => {
    setCoverBusy(true);
    setCoverNote('Mirando las fotos…');
    try {
      const r = await pickCoverWithAI();
      setCoverNote(r.reason ? `✓ Portada: ${r.reason}` : '✓ Portada elegida');
    } catch (e: any) {
      if (e?.message === 'NO_API_KEY') {
        setCoverNote('Falta tu API key de Claude (botón ✨ Caption). Las fotos quedan igual.');
      } else {
        setCoverNote('No se pudo (quedan igual): ' + (e?.message || e));
      }
    } finally {
      setCoverBusy(false);
    }
  };

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
                  draggable
                  onDragStart={(e) => setDragPhoto(e, i)}
                  title="Arrastrá esta foto a cualquier celda de la placa"
                  className={`block w-full aspect-square bg-neutral-100 rounded overflow-hidden border-2 transition cursor-grab active:cursor-grabbing ${i === activeIdx ? 'border-brand' : 'border-transparent hover:border-neutral-300'}`}
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

          {photos.length > 1 && (
            <div>
              <button className="btn w-full justify-center text-xs" disabled={coverBusy} onClick={handlePickCover}>
                <Sparkles className="w-3.5 h-3.5" /> {coverBusy ? 'Eligiendo…' : 'Elegir portada con IA'}
              </button>
              {coverNote && <div className="text-[10px] text-brand mt-1 font-medium leading-tight">{coverNote}</div>}
            </div>
          )}

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
