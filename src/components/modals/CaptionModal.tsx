import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { buildCaption } from '@/lib/format';
import { Copy, Check, MessageCircle, Sparkles, Key, Loader2 } from 'lucide-react';
import { get, set } from 'idb-keyval';

type Style = 'formal' | 'casual' | 'premium' | 'urgente' | 'casual_emoji';
type AITone = 'natural' | 'casual' | 'formal' | 'premium' | 'urgente' | 'storytelling';

const STYLE_LABELS: Record<Style, string> = {
  casual_emoji: 'Casual + Emojis',
  casual: 'Casual',
  formal: 'Formal',
  premium: 'Premium',
  urgente: 'Urgente',
};

const AI_TONE_LABELS: Record<AITone, string> = {
  natural: 'Natural',
  casual: 'Casual',
  formal: 'Formal',
  premium: 'Premium',
  urgente: 'Urgente',
  storytelling: 'Story',
};

interface Props { open: boolean; onClose: () => void }

export const CaptionModal: React.FC<Props> = ({ open, onClose }) => {
  const data = usePlacaStore((s) => s.data);
  const [mode, setMode] = useState<'preset' | 'ai'>('preset');
  const [style, setStyle] = useState<Style>('casual_emoji');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  // AI state
  const [apiKey, setApiKey] = useState('');
  const [aiTone, setAiTone] = useState<AITone>('natural');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [aiSelected, setAiSelected] = useState(0);
  const [aiError, setAiError] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);

  useEffect(() => {
    if (open) setText(buildCaption(data, style));
    if (open) get<string>('anthropic_api_key').then((k) => setApiKey(k || ''));
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

  const saveKey = async () => {
    await set('anthropic_api_key', apiKey.trim());
    setShowKeyForm(false);
  };

  const handleGenerateAI = async () => {
    if (!apiKey.trim()) { setShowKeyForm(true); return; }
    setAiBusy(true);
    setAiError('');
    setAiVariants([]);
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          data,
          tone: aiTone,
          handle: '@zamboni.inmobiliaria',
          variants: 3,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || ('HTTP ' + res.status));
      }
      const captions = (json.captions || []).map((c: any) => c.text).filter(Boolean);
      if (captions.length === 0) throw new Error('Claude no devolvió captions válidos');
      setAiVariants(captions);
      setAiSelected(0);
      setText(captions[0]);
    } catch (e: any) {
      setAiError(e?.message || 'Error generando con Claude');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Caption Instagram" width={680}>
      <div className="p-5 space-y-4">
        {/* Mode tabs */}
        <div className="flex gap-1.5 border-b border-neutral-200 pb-2">
          <button
            onClick={() => { setMode('preset'); setText(buildCaption(data, style)); }}
            className={`btn btn-ghost ${mode === 'preset' ? 'text-brand font-bold' : ''}`}
          >
            <span className="text-xs">5 estilos</span>
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`btn btn-ghost ${mode === 'ai' ? 'text-brand font-bold' : ''}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs">Claude IA</span>
            <span className="text-[9px] bg-brand text-white px-1 rounded">PRO</span>
          </button>
        </div>

        {mode === 'preset' ? (
          <>
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
          </>
        ) : (
          <>
            {showKeyForm || !apiKey ? (
              <div className="bg-neutral-50 border border-neutral-200 rounded p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Key className="w-3.5 h-3.5 text-brand" />
                  <span>Anthropic API Key</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  Conseguila en{' '}
                  <a href="https://console.anthropic.com/" target="_blank" className="text-brand underline">console.anthropic.com</a>.
                  Se guarda en este navegador (IndexedDB), nunca se envía a nuestro server. Cada caption cuesta ~$0.002.
                </p>
                <input
                  type="password"
                  className="input"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <button className="btn flex-1" onClick={() => setShowKeyForm(false)}>Cancelar</button>
                  <button className="btn btn-primary flex-1" disabled={!apiKey.trim()} onClick={saveKey}>Guardar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1">
                  {(Object.keys(AI_TONE_LABELS) as AITone[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAiTone(t)}
                      disabled={aiBusy}
                      className={`text-[10.5px] font-semibold py-2 rounded transition ${aiTone === t ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                    >
                      {AI_TONE_LABELS[t]}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowKeyForm(true)}
                    className="text-[10.5px] py-2 rounded bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                    title="Cambiar API key"
                  >
                    <Key className="w-3 h-3 mx-auto" />
                  </button>
                </div>

                <button
                  onClick={handleGenerateAI}
                  disabled={aiBusy}
                  className="btn btn-primary w-full justify-center"
                >
                  {aiBusy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando 3 variantes con Claude…</> : <><Sparkles className="w-3.5 h-3.5" /> Generar con Claude IA</>}
                </button>

                {aiError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2 rounded">{aiError}</div>
                )}

                {aiVariants.length > 0 && (
                  <div>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      {aiVariants.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setAiSelected(i); setText(aiVariants[i]); }}
                          className={`text-[11px] py-1.5 rounded transition ${aiSelected === i ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700'}`}
                        >
                          Variante {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-72 bg-neutral-50 border border-neutral-200 rounded p-3 text-sm leading-relaxed resize-none focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                  placeholder={aiVariants.length === 0 ? 'Generá variantes con Claude IA para empezar…' : ''}
                />
              </>
            )}
          </>
        )}

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
