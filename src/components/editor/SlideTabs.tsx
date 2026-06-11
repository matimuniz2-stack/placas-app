import React from 'react';
import { usePlacaStore } from '@/lib/store';
import { ALL_TEMPLATES } from '@/components/templates/registry';
import { Plus, X, Copy } from 'lucide-react';

// Pestañas del carrusel (Placa 1 / Placa 2 / +) flotando arriba del canvas.
// Cada placa tiene su propio template, layout y textos; datos y fotos son compartidos.
export const SlideTabs: React.FC = () => {
  const slides = usePlacaStore((s) => s.slides);
  const active = usePlacaStore((s) => s.activeSlide);
  const setActiveSlide = usePlacaStore((s) => s.setActiveSlide);
  const addSlide = usePlacaStore((s) => s.addSlide);
  const duplicateSlide = usePlacaStore((s) => s.duplicateSlide);
  const removeSlide = usePlacaStore((s) => s.removeSlide);
  const liveTemplateId = usePlacaStore((s) => s.templateId);

  const nameFor = (i: number) => {
    const tid = i === active ? liveTemplateId : slides[i]?.templateId;
    return ALL_TEMPLATES.find((t) => t.id === tid)?.name || tid || '';
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid #e5e5e5',
        borderRadius: 999,
        padding: 4,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}
    >
      {slides.map((_, i) => (
        <div key={i} className="relative group">
          <button
            onClick={() => setActiveSlide(i)}
            className={`h-7 pl-3 rounded-full text-[11px] font-semibold transition flex items-center gap-1.5 ${
              i === active ? 'bg-brand text-white pr-3' : 'text-neutral-600 hover:bg-neutral-100 pr-3'
            } ${slides.length > 1 ? 'group-hover:pr-6' : ''}`}
            title={`Placa ${i + 1} · ${nameFor(i)}`}
          >
            Placa {i + 1}
            <span className={`text-[9px] font-normal ${i === active ? 'text-white/80' : 'text-neutral-400'}`}>{nameFor(i)}</span>
          </button>
          {slides.length > 1 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`¿Borrar la Placa ${i + 1}?`)) removeSlide(i);
              }}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition cursor-pointer ${
                i === active ? 'text-white/80 hover:text-white' : 'text-neutral-400 hover:text-brand'
              }`}
              title="Borrar placa"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </div>
      ))}
      <button
        onClick={() => addSlide()}
        className="h-7 w-7 rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-brand transition flex items-center justify-center"
        title="Agregar placa al carrusel"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => duplicateSlide()}
        className="h-7 w-7 rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-brand transition flex items-center justify-center"
        title="Duplicar la placa actual (para probar variantes)"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
