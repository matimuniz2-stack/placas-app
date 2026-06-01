import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { usePlacaStore } from '@/lib/store';
import { listDrafts, saveDraft, deleteDraft } from '@/lib/drafts';
import { Save, Trash2, FileDown } from 'lucide-react';
import type { Draft } from '@/types';

interface Props { open: boolean; onClose: () => void }

export const DraftsModal: React.FC<Props> = ({ open, onClose }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [name, setName] = useState('');

  const refresh = () => listDrafts().then(setDrafts);
  useEffect(() => { if (open) refresh(); }, [open]);

  const handleSave = async () => {
    const s = usePlacaStore.getState();
    const id = 'd_' + Date.now();
    const draftName = name || s.data.addr || 'Propiedad sin título';
    const draft: Draft = {
      id,
      name: draftName,
      savedAt: new Date().toISOString(),
      data: s.data,
      photos: s.photos,
      templateId: s.templateId,
      layerOverrides: s.layerOverrides,
      textOverrides: s.textOverrides,
      theme: s.theme,
      badges: s.badges,
    };
    await saveDraft(draft);
    setName('');
    refresh();
  };

  const handleLoad = (d: Draft) => {
    usePlacaStore.setState({
      data: d.data,
      photos: d.photos || [],
      activePhotoIdx: 0,
      templateId: d.templateId,
      layerOverrides: d.layerOverrides || {},
      textOverrides: d.textOverrides || {},
      theme: d.theme,
      badges: d.badges || [],
    });
    onClose();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar borrador?')) return;
    await deleteDraft(id);
    refresh();
  };

  return (
    <Modal open={open} onClose={onClose} title="Borradores" width={560}>
      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Nombre del borrador (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Guardar actual
          </button>
        </div>

        <div className="divider" />

        {drafts.length === 0 ? (
          <div className="text-center text-neutral-400 text-sm py-6">No hay borradores aún. Guardá el actual con el botón de arriba.</div>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-2.5 border border-neutral-200 rounded hover:bg-neutral-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-[11px] text-neutral-400">
                    {new Date(d.savedAt).toLocaleString('es-AR')} · {d.templateId} · {d.photos?.length || 0} fotos
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => handleLoad(d)}><FileDown className="w-3.5 h-3.5" /> Cargar</button>
                <button className="btn btn-ghost text-brand" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
