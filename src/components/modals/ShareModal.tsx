import React, { useState } from 'react';
import { Modal } from './Modal';
import { Copy, Check } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; url: string }

export const ShareModal: React.FC<Props> = ({ open, onClose, url }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Modal open={open} onClose={onClose} title="Compartir placa" width={520}>
      <div className="p-5 space-y-3">
        <p className="text-sm text-neutral-600">Copiá este link para compartir la configuración del placa. Quien lo abra verá el mismo diseño (sin fotos, para no saturar la URL).</p>
        <div className="flex gap-2">
          <input className="input flex-1 font-mono text-[11px]" value={url} readOnly onFocus={(e) => e.target.select()} />
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};
