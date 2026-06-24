import React, { useState } from 'react';
import { Link2, PencilLine } from 'lucide-react';
import { importFromUrl } from '@/lib/importListing';

// Pantalla de inicio con dos modos que terminan en el MISMO editor/estado:
//  - "Importar de listing (automático)": pega link → extrae datos + fotos → arma 2 placas.
//  - "Empezar a mano": entra al editor sin armado automático.
export const StartScreen: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');

  const handleImport = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      await importFromUrl(url.trim(), setProgress);
      onEnter();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-1">
          <span className="text-2xl font-extrabold tracking-tight">ZAMBONI</span>
          <span className="text-[10px] font-bold tracking-[2px] text-neutral-400 mt-1">PLACAS</span>
        </div>
        <p className="text-center text-sm text-neutral-500 mb-8">Generá la placa para historias de IG / WhatsApp.</p>

        {/* Importar de listing (automático) */}
        <div className="bg-white border border-brand/30 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <Link2 className="w-4 h-4 text-brand" />
            <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-brand">Importar de listing (automático)</span>
          </div>
          <p className="text-[11px] text-neutral-500 mb-3 leading-snug">
            Pegá el link (Mercado Libre, Zonaprop, Argenprop, ficha.info/Tokko) y te arma las 2 placas con datos y fotos, listo para revisar.
          </p>
          <input
            className="input w-full mb-2"
            placeholder="https://…"
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleImport(); }}
          />
          <button className="btn btn-primary w-full justify-center" disabled={busy || !url.trim()} onClick={handleImport}>
            {busy ? (progress || 'Armando…') : 'Importar y armar placas'}
          </button>
          {err && <div className="text-[11px] text-red-600 mt-2 leading-snug">{err}</div>}
        </div>

        <div className="text-center text-[11px] text-neutral-400 my-3">o</div>

        {/* Empezar a mano */}
        <button
          className="w-full bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-400 transition flex items-center gap-3 text-left"
          disabled={busy}
          onClick={onEnter}
        >
          <PencilLine className="w-5 h-5 text-neutral-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-neutral-800">Empezar a mano</div>
            <div className="text-[11px] text-neutral-500">Editor en blanco / donde lo dejaste, sin armado automático.</div>
          </div>
        </button>
      </div>
    </div>
  );
};
