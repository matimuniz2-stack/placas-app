import React, { useState } from 'react';
import { usePlacaStore, getEffectiveLayer } from '@/lib/store';
import { ALL_TEMPLATES, templatesByCategory } from '@/components/templates/registry';
import { VARIANTS } from '@/lib/variants';
import { BACKGROUNDS } from '@/lib/backgrounds';
import { BADGE_PRESETS } from '@/components/templates/primitives/Badge';
import { HexColorPicker } from 'react-colorful';
import { Eye, EyeOff, RotateCcw, Upload, Sparkles } from 'lucide-react';
import { PlacaRenderer } from '@/components/templates/Renderer';
import type { LayerId } from '@/types';

type Tab = 'inspector' | 'templates' | 'tema' | 'extras';

const LAYER_LABELS: Partial<Record<LayerId, string>> = {
  photo: 'Foto',
  logo: 'Logo',
  addr: 'Dirección',
  barrio: 'Barrio',
  price: 'Precio',
  amen: 'Detalles',
  op: 'Operación',
  desc: 'Descripción',
  extras: 'Extras',
  tag: 'Tag',
  lbl: 'Etiqueta',
  num: 'Número',
  badge: 'Sticker',
  qr: 'QR',
  agent: 'Agente',
  line: 'Línea',
  dot: 'Punto',
};

export const SidebarRight: React.FC = () => {
  const [tab, setTab] = useState<Tab>('inspector');
  const open = usePlacaStore((s) => s.sidebarRightOpen);
  const selected = usePlacaStore((s) => s.selectedLayer);

  // Hooks must be called unconditionally — keep them BEFORE any early return
  React.useEffect(() => {
    if (selected) setTab('inspector');
  }, [selected]);

  if (!open) return null;

  return (
    <aside
      className="bg-white border-l border-neutral-200 flex flex-col h-full"
      style={{ width: 300, flexShrink: 0 }}
    >
      <div className="flex border-b border-neutral-200 bg-panel">
        {(['inspector', 'templates', 'tema', 'extras'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[10.5px] font-semibold tracking-[1.2px] uppercase transition ${tab === t ? 'bg-white text-brand border-b-2 border-brand' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'inspector' && <InspectorTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'tema' && <TemaTab />}
        {tab === 'extras' && <ExtrasTab />}
      </div>
    </aside>
  );
};

const InspectorTab: React.FC = () => {
  const templateId = usePlacaStore((s) => s.templateId);
  const tpl = ALL_TEMPLATES.find((t) => t.id === templateId)!;
  const selected = usePlacaStore((s) => s.selectedLayer);
  const select = usePlacaStore((s) => s.selectLayer);
  const overrides = usePlacaStore((s) => s.layerOverrides);
  const patchLayer = usePlacaStore((s) => s.patchLayer);
  const resetLayer = usePlacaStore((s) => s.resetLayer);

  const layerIds = Object.keys(tpl.defaultLayers) as LayerId[];

  const layer = selected ? getEffectiveLayer(selected) : null;

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Layers list */}
      <div>
        <div className="section-title mb-2">Layers</div>
        <div className="space-y-1">
          {layerIds.map((lid) => {
            const ov = overrides[lid];
            const isVis = ov?.visible ?? tpl.defaultLayers[lid]!.visible !== false;
            const isSel = selected === lid;
            return (
              <div key={lid} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs cursor-pointer transition ${isSel ? 'bg-brand/10 text-brand' : 'hover:bg-neutral-100 text-neutral-700'}`} onClick={() => select(lid)}>
                <button onClick={(e) => { e.stopPropagation(); patchLayer(lid, { visible: !isVis }); }} className="text-neutral-400 hover:text-brand">
                  {isVis ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <span className="flex-1 capitalize">{LAYER_LABELS[lid] || lid}</span>
                {ov && <button onClick={(e) => { e.stopPropagation(); resetLayer(lid); }} className="text-neutral-400 hover:text-brand"><RotateCcw className="w-3 h-3" /></button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector for selected layer */}
      {selected && layer && (
        <>
          <div className="divider" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="section-title">{LAYER_LABELS[selected] || selected}</span>
              <button className="text-[10px] text-neutral-400 hover:text-brand uppercase tracking-wider" onClick={() => resetLayer(selected)}>Reset</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <NumInput label="X" v={layer.x} on={(x) => patchLayer(selected, { x })} suffix="%" />
              <NumInput label="Y" v={layer.y} on={(y) => patchLayer(selected, { y })} suffix="%" />
              <NumInput label="W" v={layer.w} on={(w) => patchLayer(selected, { w })} suffix="%" />
              <NumInput label="H" v={layer.h || 0} on={(h) => patchLayer(selected, { h })} suffix="%" />
              <NumInput label="Rot" v={layer.rotation || 0} on={(rotation) => patchLayer(selected, { rotation })} suffix="°" />
              <NumInput label="Opacidad" v={Math.round((layer.opacity ?? 1) * 100)} on={(v) => patchLayer(selected, { opacity: v / 100 })} suffix="%" />
            </div>

            {layer.font !== undefined && (
              <>
                <div className="divider my-3" />
                <div className="space-y-2">
                  <div>
                    <label className="label">Fuente</label>
                    <select className="select" value={layer.font || ''} onChange={(e) => patchLayer(selected, { font: e.target.value })}>
                      {['Inter', 'Bebas Neue', 'Cormorant Garamond', 'DM Serif Display', 'Marcellus', 'Tenor Sans', 'IBM Plex Mono', 'Cinzel', 'Playfair Display', 'Space Grotesk', 'Italiana', 'Anton', 'JetBrains Mono', 'Outfit'].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumInput label="Tamaño" v={layer.size || 0} on={(size) => patchLayer(selected, { size })} suffix="px" />
                    <div>
                      <label className="label">Peso</label>
                      <select className="select" value={layer.weight || 400} onChange={(e) => patchLayer(selected, { weight: parseInt(e.target.value) })}>
                        {[300, 400, 500, 600, 700, 800, 900].map((w) => (<option key={w} value={w}>{w}</option>))}
                      </select>
                    </div>
                    <NumInput label="Tracking" v={layer.letterSpacing ?? 0} on={(letterSpacing) => patchLayer(selected, { letterSpacing })} suffix="px" />
                    <NumInput label="Altura" v={layer.lineHeight ? layer.lineHeight * 10 : 12} on={(v) => patchLayer(selected, { lineHeight: v / 10 })} suffix="" />
                  </div>
                  <div>
                    <label className="label">Color</label>
                    <ColorField v={layer.color || '#000'} on={(c) => patchLayer(selected, { color: c })} />
                  </div>
                  <div>
                    <label className="label">Alineación</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} onClick={() => patchLayer(selected, { align: a })} className={`h-8 text-xs rounded border transition ${layer.align === a ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200 text-neutral-600'}`}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => patchLayer(selected, { italic: !layer.italic })} className={`h-7 text-xs rounded border transition italic ${layer.italic ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}>Itálica</button>
                    <button onClick={() => patchLayer(selected, { uppercase: !layer.uppercase })} className={`h-7 text-xs rounded border transition uppercase ${layer.uppercase ? 'bg-brand text-white border-brand' : 'bg-white border-neutral-200'}`}>CAPS</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const NumInput: React.FC<{ label: string; v: number; on: (v: number) => void; suffix?: string }> = ({ label, v, on, suffix }) => (
  <div>
    <label className="text-[9px] text-neutral-500 tracking-[1.2px] uppercase font-semibold block mb-0.5">{label}</label>
    <div className="relative">
      <input className="input-num" type="number" step="0.5" value={Math.round(v * 10) / 10} onChange={(e) => on(parseFloat(e.target.value) || 0)} />
      {suffix && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">{suffix}</span>}
    </div>
  </div>
);

const ColorField: React.FC<{ v: string; on: (v: string) => void }> = ({ v, on }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <button onClick={() => setOpen(!open)} className="w-8 h-8 rounded border border-neutral-200" style={{ background: v }} />
        <input className="input flex-1" value={v} onChange={(e) => on(e.target.value)} />
      </div>
      {open && (
        <div className="absolute right-0 top-9 z-30 bg-white border border-neutral-200 rounded shadow-lg p-2">
          <HexColorPicker color={v} onChange={on} />
        </div>
      )}
    </div>
  );
};

const TemplatesTab: React.FC = () => {
  const cats = templatesByCategory();
  const templateId = usePlacaStore((s) => s.templateId);
  const variantId = usePlacaStore((s) => s.variantId);
  const setTemplate = usePlacaStore((s) => s.setTemplate);
  const setVariant = usePlacaStore((s) => s.setVariant);

  return (
    <div className="px-3 py-3 space-y-4">
      <div>
        <div className="section-title mb-2">Variante</div>
        <div className="grid grid-cols-3 gap-1.5">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              className={`rounded border-2 overflow-hidden transition ${variantId === v.id ? 'border-brand' : 'border-neutral-200 hover:border-neutral-400'}`}
            >
              <div className="aspect-square" style={{ background: v.thumb.bg, color: v.thumb.fg, fontFamily: v.fontPrimary || 'Inter', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Aa</div>
              <div className="text-[9px] py-1 px-1 text-center text-neutral-600 truncate">{v.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {Object.entries(cats).map(([cat, tpls]) => (
        <div key={cat}>
          <div className="section-title mb-2">{cat}</div>
          <div className="grid grid-cols-2 gap-2">
            {tpls.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`rounded border-2 overflow-hidden transition relative aspect-[9/16] ${templateId === t.id ? 'border-brand' : 'border-neutral-200 hover:border-neutral-400'}`}
                title={t.name}
                style={{ background: t.bgColor || '#1a1a1a' }}
              >
                <ThumbPreview templateId={t.id} />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] py-0.5 text-center uppercase tracking-wider truncate z-10">{t.name}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ThumbPreview: React.FC<{ templateId: string }> = ({ templateId }) => {
  const THUMB_W = 130;
  const scale = THUMB_W / 1080;
  return (
    <div className="tpl-thumb-static" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <PlacaRenderer overrideTemplateId={templateId} formatOverride="story" noOverrides />
      </div>
    </div>
  );
};

const TemaTab: React.FC = () => {
  const theme = usePlacaStore((s) => s.theme);
  const patchTheme = usePlacaStore((s) => s.patchTheme);
  const abbreviate = usePlacaStore((s) => s.abbreviatePrice);
  const setAbbreviate = usePlacaStore((s) => s.setAbbreviate);

  const handleLogo = (file: File) => {
    const r = new FileReader();
    r.onload = () => patchTheme({ logoUrl: r.result as string });
    r.readAsDataURL(file);
  };

  return (
    <div className="px-3 py-3 space-y-4">
      <div>
        <div className="section-title mb-2">Logo</div>
        <div className="flex gap-2 items-center mb-2">
          <img src={theme.logoUrl} alt="" className="w-12 h-12 object-contain bg-neutral-100 rounded" />
          <label className="btn flex-1 justify-center cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Cambiar logo
            <input type="file" accept="image/*,.svg" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])} />
          </label>
        </div>
        <button className="btn w-full" onClick={() => patchTheme({ logoUrl: '/logo-z.png' })}>Volver al logo Z</button>
      </div>

      <div className="divider" />

      <div>
        <div className="section-title mb-2">Color de marca</div>
        <ColorField v={theme.brand} on={(brand) => patchTheme({ brand })} />
      </div>

      <div className="divider" />

      <div>
        <div className="section-title mb-2">Precio</div>
        <button
          onClick={() => setAbbreviate(!abbreviate)}
          className={`btn w-full justify-center ${abbreviate ? 'btn-primary' : ''}`}
        >
          {abbreviate ? '1.500.000 → 1.5M' : 'Mostrar abreviado (1.5M)'}
        </button>
      </div>

      <div className="divider" />

      <div>
        <div className="section-title mb-2">Fondo (sin foto)</div>
        <div className="grid grid-cols-5 gap-1.5">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              title={b.name}
              onClick={() => {
                // Apply as photo placeholder bg via theme.background CSS
                patchTheme({ background: b.css });
              }}
              className="aspect-square rounded border border-neutral-200 hover:border-brand transition"
              style={{ background: b.css }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ExtrasTab: React.FC = () => {
  const badges = usePlacaStore((s) => s.badges);
  const toggleBadge = usePlacaStore((s) => s.toggleBadge);
  const qrUrl = usePlacaStore((s) => s.qrUrl);
  const setQrUrl = usePlacaStore((s) => s.setQrUrl);

  return (
    <div className="px-3 py-3 space-y-4">
      <div>
        <div className="section-title mb-2">Stickers / Badges</div>
        <div className="grid grid-cols-2 gap-1.5">
          {BADGE_PRESETS.map((b) => {
            const active = badges.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBadge(b.id)}
                className={`text-xs font-bold tracking-wider px-2 py-2 rounded transition ${active ? 'ring-2 ring-brand' : 'opacity-60 hover:opacity-100'}`}
                style={{ background: b.bg, color: b.fg }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divider" />

      <div>
        <div className="section-title mb-2">QR Code</div>
        <input className="input" placeholder="https://link al listing…" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} />
        <p className="text-[10px] text-neutral-400 mt-1">El QR aparece en esquina inferior derecha. Movible/resize como cualquier layer.</p>
      </div>

      <div className="divider" />

      <div>
        <div className="section-title mb-2">Mejoras IA</div>
        <button className="btn w-full justify-center" onClick={() => alert('Próximamente: análisis de contraste + sugerencias de mejora.')}>
          <Sparkles className="w-3.5 h-3.5" /> Auditar diseño
        </button>
      </div>
    </div>
  );
};
