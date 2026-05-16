import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import {
  TokkoClient,
  loadTokkoKey,
  saveTokkoKey,
  clearTokkoKey,
  tokkoToPlacaData,
  tokkoPhotoUrls,
  type TokkoProperty,
  type TokkoSearchFilters,
} from '@/lib/tokko';
import { usePlacaStore } from '@/lib/store';
import { removeWatermarkZ } from '@/lib/watermark';
import { Search, Settings, Trash2, Key, CheckCircle, XCircle, Loader2, MapPin, Bed, Bath, Square as SquareIcon, ExternalLink, Eraser } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const TokkoModal: React.FC<Props> = ({ open, onClose }) => {
  const [step, setStep] = useState<'config' | 'search'>('search');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://tokkobroker.com/api/v1');
  const [savedKey, setSavedKey] = useState<{ apiKey: string; baseUrl?: string } | null>(null);

  // Search
  const [results, setResults] = useState<TokkoProperty[]>([]);
  const [searchText, setSearchText] = useState('');
  const [opType, setOpType] = useState<'all' | 'venta' | 'alquiler'>('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [roomsFrom, setRoomsFrom] = useState('');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState('');
  const [autoRemoveWm, setAutoRemoveWm] = useState(true);

  useEffect(() => {
    if (!open) return;
    loadTokkoKey().then((k) => {
      if (k) {
        setSavedKey(k);
        setApiKey(k.apiKey);
        setBaseUrl(k.baseUrl || 'https://tokkobroker.com/api/v1');
        setStep('search');
      } else {
        setStep('config');
      }
    });
  }, [open]);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const client = new TokkoClient({ apiKey: apiKey.trim(), baseUrl });
      const test = await client.test();
      if (!test.ok) {
        setError(`API key inválida o sin permisos (status ${test.status || '?'}). ${test.error?.slice(0, 200) || ''}`);
        return;
      }
      await saveTokkoKey(apiKey.trim(), baseUrl);
      setSavedKey({ apiKey: apiKey.trim(), baseUrl });
      setStep('search');
    } catch (e: any) {
      setError(e?.message || 'Error guardando key');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (newOffset = 0) => {
    if (!savedKey) return;
    setLoading(true);
    setError('');
    try {
      const client = new TokkoClient(savedKey);
      const filters: TokkoSearchFilters = {
        limit: 20,
        offset: newOffset,
        order_by: '-created_at',
      };
      if (searchText.trim()) filters.search = searchText.trim();
      if (opType === 'venta') filters.operation_types = [1];
      if (opType === 'alquiler') filters.operation_types = [2];
      if (priceFrom) filters.price_from = parseInt(priceFrom);
      if (priceTo) filters.price_to = parseInt(priceTo);
      if (roomsFrom) filters.rooms_from = parseInt(roomsFrom);
      const res = await client.search(filters);
      setResults(res.objects || []);
      setTotal(res.meta?.total_count || 0);
      setOffset(newOffset);
    } catch (e: any) {
      setError(e?.message || 'Error buscando propiedades');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (p: TokkoProperty) => {
    setImportingId(p.id);
    setImportProgress('Importando datos…');
    try {
      const data = tokkoToPlacaData(p);
      usePlacaStore.getState().patchData(data);
      // Reset photos before adding new ones
      usePlacaStore.getState().clearPhotos();

      const urls = tokkoPhotoUrls(p, 8);
      const newDataUrls: string[] = [];
      for (let i = 0; i < urls.length; i++) {
        setImportProgress(`Bajando foto ${i + 1}/${urls.length}…`);
        try {
          const res = await fetch(urls[i], { mode: 'cors' });
          if (!res.ok) continue;
          const blob = await res.blob();
          const dataUrl = await blobToDataUrl(blob);
          newDataUrls.push(dataUrl);
        } catch (e) {
          // CORS may block; try as plain URL fallback
          newDataUrls.push(urls[i]);
        }
      }

      if (autoRemoveWm && newDataUrls.length > 0) {
        for (let i = 0; i < newDataUrls.length; i++) {
          setImportProgress(`Quitando marca Z ${i + 1}/${newDataUrls.length}…`);
          try {
            newDataUrls[i] = await removeWatermarkZ(newDataUrls[i]);
          } catch (e) {
            console.warn('watermark removal failed on', i, e);
          }
        }
      }

      if (newDataUrls.length > 0) {
        usePlacaStore.getState().addPhotos(newDataUrls);
      }
      setImportProgress('Listo ✓');
      setTimeout(() => { setImportingId(null); setImportProgress(''); onClose(); }, 600);
    } catch (e: any) {
      alert('Error importando: ' + (e?.message || e));
      setImportingId(null);
      setImportProgress('');
    }
  };

  const handleResetKey = async () => {
    if (!confirm('¿Quitar la API key guardada?')) return;
    await clearTokkoKey();
    setSavedKey(null);
    setApiKey('');
    setStep('config');
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Tokko Broker · Importar propiedad" width={860}>
      <div className="p-5 space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1.5 border-b border-neutral-200 pb-2">
          <button
            onClick={() => setStep('search')}
            disabled={!savedKey}
            className={`btn btn-ghost ${step === 'search' ? 'text-brand font-bold' : ''} disabled:opacity-40`}
          >
            <Search className="w-3.5 h-3.5" /> Buscar
          </button>
          <button
            onClick={() => setStep('config')}
            className={`btn btn-ghost ${step === 'config' ? 'text-brand font-bold' : ''}`}
          >
            <Settings className="w-3.5 h-3.5" /> API Key {savedKey && <CheckCircle className="w-3 h-3 text-green-600" />}
          </button>
        </div>

        {step === 'config' && (
          <div className="space-y-3">
            <div className="bg-neutral-50 border border-neutral-200 rounded p-3 text-xs text-neutral-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <Key className="w-3.5 h-3.5 text-brand" />
                <span>Configurá tu API key de Tokko Broker</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Conseguila en Tokko Broker → Configuración → Integraciones → API. La key se guarda
                únicamente en este navegador (IndexedDB), nunca se envía a nuestro servidor.
              </p>
              <a
                href="https://www.tokkobroker.com/api/docs/"
                target="_blank"
                className="text-brand underline text-[11px] flex items-center gap-1"
              >
                Docs oficiales <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <label className="label">API Key</label>
              <input
                className="input"
                placeholder="Pegá tu API key (es un string largo)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Base URL (opcional)</label>
              <input
                className="input"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-[10px] text-neutral-400 mt-1">Dejá así salvo que tengas instancia custom.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2.5 rounded flex gap-1.5">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-between gap-2">
              {savedKey && (
                <button className="btn text-brand" onClick={handleResetKey}>
                  <Trash2 className="w-3.5 h-3.5" /> Quitar key
                </button>
              )}
              <button className="btn btn-primary ml-auto" disabled={!apiKey.trim() || loading} onClick={handleSaveKey}>
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validando…</> : <><CheckCircle className="w-3.5 h-3.5" /> Guardar y validar</>}
              </button>
            </div>
          </div>
        )}

        {step === 'search' && (
          <>
            {/* Filters */}
            <div className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-5"
                placeholder="Buscar (dirección, barrio, código…)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
              />
              <select className="select col-span-2" value={opType} onChange={(e) => setOpType(e.target.value as any)}>
                <option value="all">Op. cualquiera</option>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
              <input className="input col-span-2" placeholder="$ desde" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value.replace(/\D/g, ''))} />
              <input className="input col-span-2" placeholder="$ hasta" value={priceTo} onChange={(e) => setPriceTo(e.target.value.replace(/\D/g, ''))} />
              <button className="btn btn-primary col-span-1 justify-center" onClick={() => handleSearch(0)} disabled={loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>{total > 0 ? `${total} propiedades encontradas` : results.length > 0 ? `${results.length} resultados` : 'Hacé click en buscar'}</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={autoRemoveWm} onChange={(e) => setAutoRemoveWm(e.target.checked)} className="accent-brand" />
                <Eraser className="w-3 h-3 text-brand" />
                <span>Quitar marca Z auto al importar</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2.5 rounded">
                {error}
              </div>
            )}

            {/* Results */}
            <div className="space-y-1.5 max-h-[48vh] overflow-y-auto">
              {results.length === 0 && !loading && (
                <div className="text-center text-neutral-400 text-sm py-8">
                  Buscá una propiedad para listarla acá.
                </div>
              )}
              {results.map((p) => {
                const op = p.operations?.find((o) => o.operation_type === 'Venta') || p.operations?.[0];
                const price = op?.prices?.[0];
                const importing = importingId === p.id;
                const photo = p.photos?.find((ph) => !ph.is_blueprint)?.thumb || p.photos?.[0]?.thumb || p.photos?.[0]?.image;
                return (
                  <div key={p.id} className="flex items-stretch gap-2 border border-neutral-200 rounded hover:border-neutral-300 transition overflow-hidden">
                    <div className="w-24 h-24 flex-shrink-0 bg-neutral-100 bg-cover bg-center" style={{ backgroundImage: photo ? `url("${photo}")` : undefined }} />
                    <div className="flex-1 min-w-0 py-2 pr-2">
                      <div className="flex items-start gap-2 mb-0.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{p.fake_address || p.address || p.publication_title}</div>
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {p.location?.name || '—'}</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs font-bold text-brand">
                            {price ? `${price.currency} ${Math.round(price.price).toLocaleString('es-AR')}` : '—'}
                          </div>
                          <div className="text-[9px] text-neutral-400">{op?.operation_type || ''}</div>
                        </div>
                      </div>
                      <div className="flex gap-3 text-[10px] text-neutral-600 mb-1">
                        {p.room_amount ? <span className="flex items-center gap-1"><Bed className="w-2.5 h-2.5" /> {p.room_amount} amb</span> : null}
                        {(p.surface_covered || p.surface_total) ? <span className="flex items-center gap-1"><SquareIcon className="w-2.5 h-2.5" /> {p.surface_covered || p.surface_total} m²</span> : null}
                        {p.bathroom_amount ? <span className="flex items-center gap-1"><Bath className="w-2.5 h-2.5" /> {p.bathroom_amount}</span> : null}
                        {p.photos?.length ? <span>· 📷 {p.photos.length}</span> : null}
                      </div>
                      <div className="flex justify-end">
                        <button
                          className="btn btn-primary"
                          disabled={importing || importingId !== null}
                          onClick={() => handleImport(p)}
                        >
                          {importing ? <><Loader2 className="w-3 h-3 animate-spin" /> {importProgress}</> : 'Importar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-between text-[11px]">
                <button className="btn" disabled={offset === 0 || loading} onClick={() => handleSearch(Math.max(0, offset - 20))}>← Anterior</button>
                <span className="text-neutral-500 font-mono">{offset + 1}–{Math.min(offset + 20, total)} de {total}</span>
                <button className="btn" disabled={offset + 20 >= total || loading} onClick={() => handleSearch(offset + 20)}>Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
