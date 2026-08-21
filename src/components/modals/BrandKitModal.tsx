import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import {
  listBrandKits,
  saveBrandKit,
  deleteBrandKit,
  setActiveBrandKit,
  getActiveBrandKitId,
  type BrandKit,
} from '@/lib/brandKit';
import { HexColorPicker } from 'react-colorful';
import { Plus, Save, Trash2, Upload, Check, Briefcase } from 'lucide-react';

interface Props { open: boolean; onClose: () => void }

const FONT_OPTIONS = [
  'Gill Sans MT', 'Inter', 'Bebas Neue', 'Cormorant Garamond', 'DM Serif Display',
  'Marcellus', 'Tenor Sans', 'IBM Plex Mono', 'Cinzel',
  'Playfair Display', 'Space Grotesk', 'Italiana', 'Anton', 'Outfit',
];

export const BrandKitModal: React.FC<Props> = ({ open, onClose }) => {
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BrandKit | null>(null);
  const patchTheme = usePlacaStore((s) => s.patchTheme);
  const setAgent = usePlacaStore((s) => s.setAgent);

  const refresh = async () => {
    const [k, a] = await Promise.all([listBrandKits(), getActiveBrandKitId()]);
    setKits(k);
    setActiveId(a || k[0].id);
  };

  useEffect(() => { if (open) refresh(); }, [open]);

  const applyKit = async (k: BrandKit) => {
    await setActiveBrandKit(k.id);
    setActiveId(k.id);
    patchTheme({
      brand: k.brandColor,
      logoUrl: k.logoUrl,
      fontPrimary: k.fontPrimary,
      fontSecondary: k.fontSecondary,
    });
    if (k.agent) setAgent({ name: k.agent.name, phone: k.agent.phone, photoUrl: k.agent.photoUrl });
  };

  const handleSave = async (kit: BrandKit) => {
    await saveBrandKit(kit);
    setEditing(null);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar este brand kit?')) return;
    await deleteBrandKit(id);
    refresh();
  };

  const handleNew = () => {
    setEditing({
      id: 'kit_' + Date.now(),
      name: 'Nueva marca',
      logoUrl: '/logo-z.png',
      brandColor: '#de1f1a',
      fontPrimary: 'Inter',
      fontSecondary: 'Cormorant Garamond',
      captionHandle: '',
      createdAt: new Date().toISOString(),
    });
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Brand Kits · Multi-marca" width={editing ? 620 : 540}>
      <div className="p-5 space-y-3">
        {!editing ? (
          <>
            <p className="text-[11px] text-neutral-500">
              Guardá combos completos (logo + paleta + fuentes + agente). Switch entre proyectos con 1 click.
            </p>

            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
              {kits.map((k) => {
                const active = k.id === activeId;
                return (
                  <div
                    key={k.id}
                    className={`flex items-center gap-2 p-2.5 border-2 rounded transition ${active ? 'border-brand bg-brand/5' : 'border-neutral-200'}`}
                  >
                    <div className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-neutral-200">
                      <img src={k.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: k.brandColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{k.name}</div>
                      <div className="text-[10px] text-neutral-400">
                        {k.fontPrimary} · {k.captionHandle || '—'}{k.agent ? ' · ' + k.agent.name : ''}
                      </div>
                    </div>
                    {active ? (
                      <span className="text-[10px] text-brand font-bold flex items-center gap-1"><Check className="w-3 h-3" />ACTIVO</span>
                    ) : (
                      <button className="btn btn-ghost" onClick={() => applyKit(k)}>Aplicar</button>
                    )}
                    {k.id !== 'zamboni-default' && (
                      <>
                        <button className="btn btn-ghost btn-icon" onClick={() => setEditing(k)} title="Editar">✎</button>
                        <button className="btn btn-ghost btn-icon text-brand" onClick={() => handleDelete(k.id)} title="Borrar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={handleNew} className="btn btn-primary w-full justify-center">
              <Plus className="w-3.5 h-3.5" /> Nuevo brand kit
            </button>
          </>
        ) : (
          <BrandKitEditor
            kit={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}
      </div>
    </Modal>
  );
};

const BrandKitEditor: React.FC<{ kit: BrandKit; onSave: (k: BrandKit) => void; onCancel: () => void }> = ({ kit, onSave, onCancel }) => {
  const [k, setK] = useState<BrandKit>({ ...kit });
  const [colorOpen, setColorOpen] = useState(false);
  const set = (patch: Partial<BrandKit>) => setK((prev) => ({ ...prev, ...patch }));

  const handleLogoUpload = (file: File) => {
    const r = new FileReader();
    r.onload = () => set({ logoUrl: r.result as string });
    r.readAsDataURL(file);
  };
  const handleAgentPhotoUpload = (file: File) => {
    const r = new FileReader();
    r.onload = () => set({ agent: { ...(k.agent || { name: '', phone: '' }), photoUrl: r.result as string } });
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <Field label="Nombre del kit" value={k.name} onChange={(v) => set({ name: v })} placeholder="Ej: Zamboni Norte" />

      <div className="grid grid-cols-[100px_1fr] gap-3 items-start">
        <div>
          <label className="label">Logo</label>
          <div className="w-24 h-24 rounded border border-neutral-200 bg-white flex items-center justify-center overflow-hidden">
            <img src={k.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
          </div>
          <label className="btn w-24 mt-1.5 justify-center cursor-pointer">
            <Upload className="w-3 h-3" /> Subir
            <input type="file" accept="image/*,.svg" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
          </label>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <label className="label">Color de marca</label>
            <div className="flex gap-1.5">
              <button onClick={() => setColorOpen(!colorOpen)} className="w-9 h-9 rounded border border-neutral-200" style={{ background: k.brandColor }} />
              <input className="input flex-1" value={k.brandColor} onChange={(e) => set({ brandColor: e.target.value })} />
            </div>
            {colorOpen && (
              <div className="mt-2"><HexColorPicker color={k.brandColor} onChange={(c) => set({ brandColor: c })} /></div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Fuente principal</label>
          <select className="select" value={k.fontPrimary} onChange={(e) => set({ fontPrimary: e.target.value })}>
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fuente secundaria</label>
          <select className="select" value={k.fontSecondary} onChange={(e) => set({ fontSecondary: e.target.value })}>
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <Field label="Handle IG (para captions)" value={k.captionHandle || ''} onChange={(v) => set({ captionHandle: v })} placeholder="@tu.cuenta" />

      <div className="border-t border-neutral-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-neutral-500">Agente (opcional)</span>
          {!k.agent ? (
            <button className="btn btn-ghost" onClick={() => set({ agent: { name: '', phone: '' } })}>+ Agregar</button>
          ) : (
            <button className="btn btn-ghost text-brand" onClick={() => set({ agent: undefined })}>Quitar</button>
          )}
        </div>
        {k.agent && (
          <div className="space-y-2">
            <Field label="Nombre" value={k.agent.name} onChange={(v) => set({ agent: { ...k.agent!, name: v } })} />
            <Field label="Teléfono" value={k.agent.phone} onChange={(v) => set({ agent: { ...k.agent!, phone: v } })} />
            <div className="flex items-center gap-2">
              <label className="btn cursor-pointer">
                <Upload className="w-3 h-3" /> Foto agente
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAgentPhotoUpload(e.target.files[0])} />
              </label>
              {k.agent.photoUrl && <img src={k.agent.photoUrl} className="w-10 h-10 rounded-full object-cover" />}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
        <button className="btn" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave(k)} disabled={!k.name.trim()}>
          <Save className="w-3.5 h-3.5" /> Guardar
        </button>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  </div>
);
