import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { buildCaption } from '@/lib/format';
import { Copy, Check, MessageCircle } from 'lucide-react';

type Style = 'formal' | 'casual' | 'premium' | 'urgente' | 'casual_emoji';

const STYLE_LABELS: Record<Style, string> = {
  casual_emoji: 'Casual + Emojis',
  casual: 'Casual',
  formal: 'Formal',
  premium: 'Premium',
  urgente: 'Urgente',
};

interface Props { open: boolean; onClose: () => void }

export const CaptionModal: React.FC<Props> = ({ open, onClose }) => {
  const data = usePlacaStore((s) => s.data);
  const [style, setStyle] = useState<Style>('casual_emoji');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setText(buildCaption(data, style));
  }, [open, style, data]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal open={open} onClose={onClose} title="Caption Instagram" width={620}>
      <div className="p-5 space-y-4">
        <div>
          <label className="label">Estilo</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(STYLE_LABELS) as Style[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`text-[11px] font-semibold py-2 rounded transition ${style === s ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                {STYLE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-72 bg-neutral-50 border border-neutral-200 rounded p-3 text-sm leading-relaxed resize-none focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none font-mono"
        />

        <div className="grid grid-cols-2 gap-2">
          <button className="btn justify-center" onClick={handleWhatsApp}>
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button className="btn btn-primary justify-center" onClick={handleCopy}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar caption</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};
